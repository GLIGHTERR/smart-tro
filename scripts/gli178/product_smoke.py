"""Capture product-only Android smoke evidence for the GLI-177 fallback."""
import json
import os
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = "com.smartplatform.smarttro"
ACTIVITY = f"{PACKAGE}/.MainActivity"
OUT = Path(os.environ.get("GLI178_EVIDENCE_DIR", "android-product-smoke"))
PILOT_MARKERS = ("G1 UI pilot", "pilot_", "QA preview only", "EXPO_PUBLIC_UI_PILOT=true")


def adb(*args, check=True):
    result = subprocess.run(["adb", *map(str, args)], capture_output=True, check=False, timeout=90)
    if check and result.returncode:
        raise subprocess.CalledProcessError(result.returncode, result.args, result.stdout, result.stderr)
    return result


def shell(*args):
    return adb("shell", *args).stdout.decode("utf-8", "replace")


def hierarchy(retries=2):
    """Read a complete UI dump; the emulator briefly exposes an empty file on launch."""
    last_error = None
    for attempt in range(retries + 1):
        try:
            shell("uiautomator", "dump", "/sdcard/gli178.xml")
            xml = adb("exec-out", "cat", "/sdcard/gli178.xml").stdout.decode("utf-8")
            ET.fromstring(xml)
            return xml
        except (ET.ParseError, subprocess.CalledProcessError) as error:
            last_error = error
            if attempt < retries:
                time.sleep(0.4)
    raise last_error


def foreground():
    dump = shell("dumpsys", "activity", "activities") + "\n" + shell("dumpsys", "window", "windows")
    match = re.search(r"(?:mResumedActivity|topResumedActivity|mCurrentFocus).*?\s(?:u\d+\s+)?([\w.]+)/(\.?[\w.$]+)", dump)
    return {"package": match.group(1), "activity": match.group(2)} if match else {"package": None, "activity": None}


def wait_for(predicate, description, timeout=20):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.4)
    raise TimeoutError(f"Timed out waiting for {description}")


def node(xml, value):
    root = ET.fromstring(xml)
    for item in root.iter("node"):
        if value in (item.get("text"), item.get("content-desc")):
            return item
    raise LookupError(f"Product UI node not found: {value}")


def tap(item):
    match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", item.get("bounds") or "")
    if not match:
        raise ValueError(f"Invalid UI bounds: {item.get('bounds')!r}")
    x1, y1, x2, y2 = map(int, match.groups())
    shell("input", "tap", (x1 + x2) // 2, (y1 + y2) // 2)


def capture(name, xml=None):
    OUT.mkdir(parents=True, exist_ok=True)
    xml = xml or hierarchy()
    (OUT / f"{name}.xml").write_text(xml, encoding="utf-8")
    (OUT / f"{name}.png").write_bytes(adb("exec-out", "screencap", "-p").stdout)
    (OUT / f"{name}.state.json").write_text(json.dumps({"foreground": foreground()}, indent=2), encoding="utf-8")


def assert_product(xml):
    if any(marker in xml for marker in PILOT_MARKERS):
        raise AssertionError("Pilot identifier found in product artifact UI")
    if foreground()["package"] != PACKAGE:
        raise AssertionError(f"Expected {PACKAGE} foreground, got {foreground()}")


def run():
    shell("am", "force-stop", PACKAGE)
    shell("am", "start", "-W", "-n", ACTIVITY)
    wait_for(lambda: foreground()["package"] == PACKAGE, "product foreground")
    wait_for(lambda: "Xin chào" in hierarchy(), "product Home entry")
    home = hierarchy()
    assert_product(home)
    capture("01-product-home", home)
    tap(node(home, "Tài khoản: UC-04 — Tài khoản/Cá nhân"))
    wait_for(lambda: "Tài khoản" in hierarchy(), "Account entry")
    account = hierarchy()
    assert_product(account)
    node(account, "Chỉnh sửa thông tin cá nhân")
    capture("02-product-account", account)
    tap(node(account, "Chỉnh sửa thông tin cá nhân"))
    wait_for(lambda: "Cập nhật thông tin cá nhân" in hierarchy(), "Edit Profile entry")
    edit = hierarchy()
    assert_product(edit)
    node(edit, "Họ và tên")
    node(edit, "Email chỉ đọc")
    capture("03-product-edit-profile", edit)
    (OUT / "result.json").write_text(json.dumps({"status": "PASS", "entry": "src/App", "pilot": False, "flow": ["Home", "Account", "Edit Profile"]}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    run()
