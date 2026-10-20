"""Collect pre-merge Android pilot observations on an ephemeral emulator."""
import json
import os
import re
import subprocess
import sys
import time
import traceback
import xml.etree.ElementTree as ET
from pathlib import Path


PACKAGE = "com.smartplatform.smarttro"
OUT = Path(os.environ.get("GLI156_EVIDENCE_DIR", "android-interactions"))
RESULTS = []


def select_node(xml, label):
    root = ET.fromstring(xml)
    nodes = [n for n in root.iter("node")
             if n.get("content-desc") == label or n.get("text") == label]
    if not nodes:
        raise LookupError(f"UI node not found: {label}")
    # Prefer accessible controls over their unclickable text children.
    return next((n for n in nodes if n.get("clickable") == "true"), nodes[0])


def center(bounds):
    match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds or "")
    if not match:
        raise ValueError(f"Invalid bounds: {bounds!r}")
    x1, y1, x2, y2 = map(int, match.groups())
    if x2 <= x1 or y2 <= y1:
        raise ValueError(f"Empty bounds: {bounds!r}")
    return (x1 + x2) // 2, (y1 + y2) // 2


def adb(*args, check=True):
    return subprocess.run(["adb", *map(str, args)], capture_output=True,
                          check=check, timeout=90)


def shell(*args, check=True):
    return adb("shell", *args, check=check).stdout.decode("utf-8", "replace")


def dump(name):
    # Capture the frame first so short-lived toast evidence is not lost to dump latency.
    (OUT / f"{name}.png").write_bytes(adb("exec-out", "screencap", "-p").stdout)
    shell("uiautomator", "dump", "/sdcard/gli156.xml")
    xml = adb("exec-out", "cat", "/sdcard/gli156.xml").stdout.decode("utf-8")
    ET.fromstring(xml)
    (OUT / f"{name}.xml").write_text(xml, encoding="utf-8")
    return xml


def tap(xml, label):
    node = select_node(xml, label)
    x, y = center(node.get("bounds"))
    shell("input", "tap", x, y)
    return node


def restart():
    shell("am", "force-stop", PACKAGE)
    shell("monkey", "-p", PACKAGE, "-c", "android.intent.category.LAUNCHER", "1")
    time.sleep(5)


def run_case(name, expected, action):
    result = {"case": name, "expected": expected}
    try:
        result["actual"] = action()
        result["status"] = "observed"
    except Exception as exc:
        result.update(status="failure_or_incomplete", actual=str(exc),
                      traceback=traceback.format_exc())
    RESULTS.append(result)
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
    print(json.dumps(result), flush=True)


def validation():
    restart()
    xml = dump("validation-01-initial")
    disabled = select_node(xml, "Disabled")
    assert disabled.get("enabled") == "false", "Disabled button is enabled"
    tap(xml, "Disabled")
    xml = dump("validation-02-disabled-tapped")
    assert "Page 1" in xml and "Page 2" not in xml, "Disabled tap changed page"
    tap(xml, "Validate")
    xml = dump("validation-03-empty")
    assert "Name is required" in xml, "Empty validation message missing"
    time.sleep(6)
    xml = dump("validation-04-persistent")
    assert "Name is required" in xml, "Validation message did not persist"
    tap(xml, "Name")
    shell("input", "text", "Alice")
    xml = dump("validation-05-alice")
    (OUT / "keyboard-input-method.txt").write_text(shell("dumpsys", "input_method"), encoding="utf-8")
    assert "Alice" in xml, "Entered value absent from hierarchy"
    assert "Name is required" not in xml, "Validation error remains after valid input"
    return "Disabled stayed on Page 1; required text persisted then cleared after Alice. See XML/screenshots and keyboard dump."


def dialog():
    restart()
    xml = dump("dialog-01-initial")
    tap(xml, "Name")
    shell("input", "text", "Alice")
    xml = dump("dialog-01-alice")
    assert "Alice" in xml, "Dialog state fixture was not entered"
    tap(xml, "Open dialog")
    time.sleep(1)
    xml = dump("dialog-02-open")
    assert "Pilot dialog" in xml, "Dialog title missing"
    tap(xml, "Close")
    xml = dump("dialog-03-control-close")
    assert "Pilot dialog" not in xml, "Dialog remained after Close"
    assert "Page 1" in xml and "Alice" in xml, "Close did not retain Page 1 input state"
    tap(xml, "Open dialog")
    time.sleep(1)
    xml = dump("dialog-04-reopened")
    assert "Pilot dialog" in xml, "Dialog did not reopen"
    shell("input", "keyevent", "KEYCODE_BACK")
    # Wait for React Native to commit the dismissal before collecting evidence.
    time.sleep(1)
    xml = dump("dialog-05-back")
    assert "Pilot dialog" not in xml and "Page 1" in xml, "Back did not close dialog to Page 1"
    assert "Alice" in xml, "Back did not retain Page 1 input state"
    return "Dialog opened and closed using Close and Android Back while retaining Alice. Focus/semantics in XML; announcement not measured."


def toast():
    restart()
    xml = dump("toast-01-initial")
    tap(xml, "Show toast")
    time.sleep(0.5)
    xml = dump("toast-02-immediate")
    time.sleep(6)
    later = dump("toast-03-after-six-seconds")
    assert "Saved" not in later, "Saved remains in hierarchy after six seconds"
    tap(later, "Show toast")
    time.sleep(0.5)
    # A screenshot precedes the UI dump so the five-second toast can be reviewed.
    xml = dump("toast-04-before-navigation")
    tap(xml, "Navigate")
    xml = dump("toast-05-navigation")
    assert "Page 2" in xml, "Navigation did not reach Page 2"
    time.sleep(6)
    xml = dump("toast-06-navigation-after-delay")
    assert "Saved" not in xml, "Toast remains after navigation and delay"
    return "Immediate Saved in XML: %s; absent after delay and after navigation. Same-ID dedupe is not exposed by this UI." % ("Saved" in (OUT / "toast-02-immediate.xml").read_text())


def scale_long():
    shell("settings", "put", "system", "font_scale", "1.5")
    try:
        restart()
        xml = dump("scale-01-initial")
        if "Show long toast" not in xml:
            shell("input", "swipe", "160", "520", "160", "200", "500")
            xml = dump("scale-01-scrolled")
        tap(xml, "Show long toast")
        time.sleep(0.5)
        dump("scale-02-long-toast")
        return "Requested font_scale=1.5; visual wrapping and clipping require screenshot review."
    finally:
        shell("settings", "put", "system", "font_scale", "1.0", check=False)


def orientation():
    shell("settings", "put", "system", "accelerometer_rotation", "0")
    shell("settings", "put", "system", "user_rotation", "1")
    try:
        time.sleep(2)
        xml = dump("orientation-01-request-landscape")
        (OUT / "orientation-window.txt").write_text(shell("dumpsys", "window"), encoding="utf-8")
        return "Requested user_rotation=1; hierarchy rotation=%s. App config declares portrait; review screenshot and window bounds." % ET.fromstring(xml).get("rotation")
    finally:
        shell("settings", "put", "system", "user_rotation", "0", check=False)
        shell("settings", "put", "system", "accelerometer_rotation", "1", check=False)


def accessibility():
    packages = shell("pm", "list", "packages")
    services = shell("dumpsys", "accessibility")
    (OUT / "accessibility-packages.txt").write_text(packages, encoding="utf-8")
    (OUT / "accessibility-services.txt").write_text(services, encoding="utf-8")
    talkback = "com.google.android.marvin.talkback"
    if talkback not in packages:
        return "TalkBack package not installed on this emulator; manual screen-reader and announcements not tested."
    original_services = shell("settings", "get", "secure", "enabled_accessibility_services").strip()
    original_enabled = shell("settings", "get", "secure", "accessibility_enabled").strip()
    component = talkback + "/com.google.android.marvin.talkback.TalkBackService"
    try:
        combined = component if original_services in ("", "null") else original_services + ":" + component
        shell("settings", "put", "secure", "enabled_accessibility_services", combined)
        shell("settings", "put", "secure", "accessibility_enabled", "1")
        time.sleep(3)
        enabled = shell("dumpsys", "accessibility")
        (OUT / "talkback-after-enable.txt").write_text(enabled, encoding="utf-8")
        return "TalkBack enable requested; inspect service dump. No manual screen-reader or announcement PASS claimed."
    finally:
        for key, value in (("enabled_accessibility_services", original_services), ("accessibility_enabled", original_enabled)):
            if value in ("", "null"):
                shell("settings", "delete", "secure", key, check=False)
            else:
                shell("settings", "put", "secure", key, value, check=False)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "device.txt").write_text(shell("getprop", "ro.build.version.sdk") + shell("wm", "size") + shell("getprop", "ro.product.cpu.abi"), encoding="utf-8")
    adb("logcat", "-c")
    cases = [
        ("validation_and_disabled", "Disabled cannot navigate; empty required error persists and clears for Alice.", validation),
        ("dialog_control_and_back", "Dialog opens and closes via control and Android Back.", dialog),
        ("toast_and_navigation", "Toast is transient and navigation still works.", toast),
        ("font_scale_and_long_text", "Capture long toast at font scale 1.5.", scale_long),
        ("orientation_and_safe_area", "Record actual orientation and bounds after landscape request.", orientation),
        ("accessibility_service", "Record service availability without claiming manual TalkBack PASS.", accessibility),
    ]
    try:
        for case in cases:
            run_case(*case)
    finally:
        (OUT / "logcat.txt").write_bytes(adb("logcat", "-d", "-v", "brief", check=False).stdout)
    return 1 if any(result["status"] == "failure_or_incomplete" for result in RESULTS) else 0


if __name__ == "__main__":
    sys.exit(main())
