"""Run isolated Android pilot cases with verified device-state transitions."""
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
ACTIVITY = f"{PACKAGE}/.MainActivity"
OUT = Path(os.environ.get("GLI156_EVIDENCE_DIR", "android-interactions"))
CONTRACT_PATH = Path(__file__).resolve().parents[2] / "src/pilot/interaction-contract.json"
CONTRACT = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
RESULTS = []
MIN_TAP_SIZE = 24
VIEWPORT_EDGE_INSET = 24


def select_node(xml, identifier):
    root = ET.fromstring(xml)
    nodes = [node for node in root.iter("node")
             if (node.get("resource-id") or "").rsplit("/", 1)[-1] == identifier]
    if not nodes:
        raise LookupError(f"UI node not found: {identifier}")
    return next((node for node in nodes if node.get("clickable") == "true"), nodes[0])


def center(bounds):
    match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds or "")
    if not match:
        raise ValueError(f"Invalid bounds: {bounds!r}")
    x1, y1, x2, y2 = map(int, match.groups())
    if x2 <= x1 or y2 <= y1:
        raise ValueError(f"Empty bounds: {bounds!r}")
    return (x1 + x2) // 2, (y1 + y2) // 2


def parse_bounds(bounds):
    match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds or "")
    if not match:
        raise ValueError(f"Invalid bounds: {bounds!r}")
    x1, y1, x2, y2 = map(int, match.groups())
    if x2 <= x1 or y2 <= y1:
        raise ValueError(f"Empty bounds: {bounds!r}")
    return x1, y1, x2, y2


def interaction_viewport(xml):
    root = ET.fromstring(xml)
    scrollable = next((item for item in root.iter("node") if item.get("scrollable") == "true"), None)
    if scrollable is not None:
        return scrollable, "scrollable"
    content = next((item for item in root.iter("node")
                    if (item.get("resource-id") or "").endswith("android:id/content")), None)
    if content is not None:
        return content, "fixed"
    raise LookupError("No interaction viewport in hierarchy")


def actionable_in_viewport(node, xml):
    viewport, _kind = interaction_viewport(xml)
    x1, y1, x2, y2 = parse_bounds(node.get("bounds"))
    vx1, vy1, vx2, vy2 = parse_bounds(viewport.get("bounds"))
    tap_x, tap_y = center(node.get("bounds"))
    return (
        x2 - x1 >= MIN_TAP_SIZE
        and y2 - y1 >= MIN_TAP_SIZE
        and vx1 + VIEWPORT_EDGE_INSET <= tap_x <= vx2 - VIEWPORT_EDGE_INSET
        and vy1 + VIEWPORT_EDGE_INSET <= tap_y <= vy2 - VIEWPORT_EDGE_INSET
    )


def dialog_state(xml):
    root = ET.fromstring(xml)
    title_present = any(node.get("text") == "Pilot dialog" for node in root.iter("node"))
    try:
        select_node(xml, CONTRACT["closeDialog"])
        close_present = True
    except LookupError:
        close_present = False
    if title_present and close_present:
        return "open"
    if not title_present and not close_present:
        return "closed"
    return "inconsistent"


def assert_dialog_state(xml, expected):
    actual = dialog_state(xml)
    if actual != expected:
        raise AssertionError(f"Expected dialog state {expected}, got {actual}")


def adb(*args, check=True, retries=0):
    for attempt in range(retries + 1):
        result = subprocess.run(["adb", *map(str, args)], capture_output=True,
                                check=False, timeout=90)
        if not check or result.returncode == 0:
            return result
        if attempt < retries:
            time.sleep(0.5)
    raise subprocess.CalledProcessError(
        result.returncode, result.args, output=result.stdout, stderr=result.stderr)


def shell(*args, check=True, retries=0):
    return adb("shell", *args, check=check, retries=retries).stdout.decode("utf-8", "replace")


def hierarchy():
    shell("uiautomator", "dump", "/sdcard/gli156.xml", retries=2)
    xml = adb("exec-out", "cat", "/sdcard/gli156.xml", retries=2).stdout.decode("utf-8")
    ET.fromstring(xml)
    return xml


def foreground_state(system_dump=None):
    if system_dump is None:
        system_dump = (shell("dumpsys", "activity", "activities", retries=2) + "\n" +
                       shell("dumpsys", "window", "windows", retries=2))
    match = re.search(
        r"(?:mResumedActivity|topResumedActivity|mCurrentFocus|mFocusedApp).*?\s(?:u\d+\s+)?([\w.]+)/(\.?[\w.$]+)",
        system_dump,
    )
    return {"package": match.group(1), "activity": match.group(2)} if match else {"package": None, "activity": None}


def ime_visible(input_method_dump=None):
    input_method_dump = input_method_dump if input_method_dump is not None else shell("dumpsys", "input_method", retries=2)
    return bool(re.search(r"(?:mInputShown|isInputViewShown|inputShown)=true", input_method_dump))


def wait_for(predicate, description, timeout=10, interval=0.25):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(interval)
    raise TimeoutError(f"Timed out waiting for {description}")


def assert_foreground():
    state = foreground_state()
    if state["package"] != PACKAGE:
        raise AssertionError(f"Expected {PACKAGE} foreground, got {state}")
    return state


def wait_for_foreground():
    wait_for(lambda: foreground_state()["package"] == PACKAGE, "pilot activity foreground")
    return assert_foreground()


def node_present(identifier):
    try:
        select_node(hierarchy(), identifier)
        return True
    except (LookupError, ET.ParseError, subprocess.CalledProcessError):
        return False


def read_setting(namespace, key):
    return shell("settings", "get", namespace, key, retries=2).strip()


def capture(name, xml=None):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{name}.png").write_bytes(adb("exec-out", "screencap", "-p", check=False).stdout)
    xml = xml if xml is not None else hierarchy()
    (OUT / f"{name}.xml").write_text(xml, encoding="utf-8")
    window = shell("dumpsys", "window", "windows", check=False)
    activity = shell("dumpsys", "activity", "activities", check=False)
    input_method = shell("dumpsys", "input_method", check=False)
    state = {
        "foreground": foreground_state(activity + "\n" + window),
        "imeVisible": ime_visible(input_method),
        "fontScale": read_setting("system", "font_scale"),
        "accelerometerRotation": read_setting("system", "accelerometer_rotation"),
        "userRotation": read_setting("system", "user_rotation"),
    }
    (OUT / f"{name}.state.json").write_text(json.dumps(state, indent=2), encoding="utf-8")
    (OUT / f"{name}.window.txt").write_text(window, encoding="utf-8")
    (OUT / f"{name}.activity.txt").write_text(activity, encoding="utf-8")
    (OUT / f"{name}.ime.txt").write_text(input_method, encoding="utf-8")
    return xml


def restore_device_defaults():
    shell("settings", "put", "system", "font_scale", "1.0", retries=2)
    shell("settings", "put", "system", "user_rotation", "0", retries=2)
    shell("settings", "put", "system", "accelerometer_rotation", "1", retries=2)
    wait_for(lambda: read_setting("system", "font_scale") == "1.0", "font scale reset")
    wait_for(lambda: read_setting("system", "user_rotation") == "0", "rotation reset")
    wait_for(lambda: read_setting("system", "accelerometer_rotation") == "1", "auto rotation reset")


def dismiss_ime_if_visible():
    before = foreground_state()
    if before["package"] != PACKAGE or not ime_visible():
        return False
    shell("input", "keyevent", "KEYCODE_BACK")
    wait_for(lambda: not ime_visible(), "IME dismissal")
    assert_foreground()
    return True


def teardown_case():
    dismiss_ime_if_visible()
    restore_device_defaults()
    shell("am", "force-stop", PACKAGE, retries=2)
    wait_for(lambda: foreground_state()["package"] != PACKAGE, "pilot activity stop")


def prepare_case(name, font_scale="1.0"):
    restore_device_defaults()
    shell("settings", "put", "system", "font_scale", font_scale, retries=2)
    dismiss_ime_if_visible()
    shell("am", "force-stop", PACKAGE, retries=2)
    shell("am", "start", "-W", "-n", ACTIVITY, retries=2)
    wait_for(lambda: foreground_state()["package"] == PACKAGE, "pilot activity foreground")
    wait_for(lambda: read_setting("system", "font_scale") == font_scale, f"font scale {font_scale}")
    wait_for(lambda: node_present(CONTRACT["page1"]), "Page 1 route")
    xml = capture(f"{name}-00-ready")
    select_node(xml, CONTRACT["page1"])
    select_node(xml, CONTRACT["nameInput"])
    assert_foreground()
    if ime_visible():
        raise AssertionError("IME unexpectedly visible after case reset")
    return xml


def scroll_signature(xml):
    root = ET.fromstring(xml)
    return tuple((node.get("resource-id"), node.get("bounds")) for node in root.iter("node")
                 if node.get("resource-id"))


def scroll_gesture(xml, direction="forward"):
    root = ET.fromstring(xml)
    scrollable = next((node for node in root.iter("node") if node.get("scrollable") == "true"), None)
    if scrollable is None:
        raise LookupError("No scrollable container in hierarchy")
    x1, y1, x2, y2 = parse_bounds(scrollable.get("bounds"))
    x = x2 - 12
    bottom = y2 - max(72, (y2 - y1) // 5)
    top = y1 + max(72, (y2 - y1) // 5)
    if direction == "forward":
        return x, bottom, x, top
    if direction == "backward":
        return x, top, x, bottom
    raise ValueError(f"Unknown scroll direction: {direction}")


def find_control(identifier, evidence_name, xml=None, max_swipes=8, allow_scroll=True):
    xml = xml if xml is not None else hierarchy()
    capture(f"{evidence_name}-search-00", xml)
    assert_foreground()
    try:
        node = select_node(xml, identifier)
        if actionable_in_viewport(node, xml):
            return node
    except LookupError:
        node = None
    if node is None:
        refreshed = hierarchy()
        capture(f"{evidence_name}-refresh", refreshed)
        if refreshed != xml:
            xml = refreshed
            try:
                node = select_node(xml, identifier)
                if actionable_in_viewport(node, xml):
                    return node
            except LookupError:
                node = None
    _viewport, viewport_kind = interaction_viewport(xml)
    if not allow_scroll or viewport_kind != "scrollable":
        state = dialog_state(xml)
        raise LookupError(
            f"UI node unavailable without scroll recovery: {identifier}; dialog_state={state}"
        )
    for direction in ("forward", "backward"):
        unchanged = 0
        for attempt in range(1, max_swipes + 1):
            previous = scroll_signature(xml)
            shell("input", "swipe", *scroll_gesture(xml, direction), "350")
            time.sleep(0.5)
            xml = hierarchy()
            capture(f"{evidence_name}-{direction}-{attempt:02d}", xml)
            assert_foreground()
            unchanged = unchanged + 1 if scroll_signature(xml) == previous else 0
            try:
                node = select_node(xml, identifier)
                if actionable_in_viewport(node, xml):
                    return node
            except LookupError:
                node = None
            if unchanged >= 2:
                capture(f"{evidence_name}-{direction}-no-progress", xml)
                break
    if node is not None:
        raise LookupError(f"UI node remains outside safe tap viewport: {identifier}")
    raise LookupError(f"UI node not found after bidirectional scroll stopped: {identifier}")


def tap_id(identifier, evidence_name, xml=None, allow_scroll=True):
    node = find_control(identifier, evidence_name, xml, allow_scroll=allow_scroll)
    shell("input", "tap", *center(node.get("bounds")))
    wait_for_foreground()
    return node


def assert_input_value(expected, evidence_name, xml=None):
    node = find_control(CONTRACT["nameInput"], evidence_name, xml)
    actual = node.get("text") or ""
    if actual != expected:
        raise AssertionError(f"Expected retained input {expected!r}, got {actual!r}")
    return node


def run_case(name, expected, action, font_scale="1.0"):
    result = {"case": name, "expected": expected}
    try:
        xml = prepare_case(name, font_scale=font_scale)
        result["actual"] = action(xml)
        result["status"] = "observed"
    except Exception as exc:
        try:
            capture(f"{name}-failure")
        except Exception:
            pass
        result.update(status="failure_or_incomplete", actual=str(exc),
                      traceback=traceback.format_exc())
    finally:
        try:
            teardown_case()
        except Exception as teardown_exc:
            if result.get("status") == "observed":
                result.update(status="failure_or_incomplete", actual=f"Teardown failed: {teardown_exc}")
            else:
                result["teardownError"] = str(teardown_exc)
    RESULTS.append(result)
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
    print(json.dumps(result), flush=True)


def validation(xml):
    disabled = find_control(CONTRACT["disabled"], "validation-disabled", xml)
    assert disabled.get("enabled") == "false", "Disabled button is enabled"
    tap_id(CONTRACT["disabled"], "validation-disabled-tap", xml)
    xml = capture("validation-01-disabled-tapped")
    select_node(xml, CONTRACT["page1"])
    tap_id(CONTRACT["validate"], "validation-validate", xml)
    wait_for(lambda: "Name is required" in hierarchy(), "validation message")
    xml = capture("validation-02-empty")
    assert "Name is required" in xml, "Empty validation message missing"
    time.sleep(6)
    xml = capture("validation-03-persistent")
    assert "Name is required" in xml, "Validation message did not persist"
    tap_id(CONTRACT["nameInput"], "validation-name", xml)
    shell("input", "text", "Alice")
    wait_for(lambda: "Alice" in hierarchy(), "typed fixture")
    xml = capture("validation-04-alice")
    assert "Alice" in xml, "Entered value absent from hierarchy"
    assert "Name is required" not in xml, "Validation error remains after valid input"
    assert ime_visible(), "IME should be visible after typing fixture"
    return "Disabled remained on Page 1; required text persisted then cleared after Alice."


def dialog(xml):
    tap_id(CONTRACT["nameInput"], "dialog-name", xml)
    shell("input", "text", "Alice")
    xml = capture("dialog-01-alice")
    assert dismiss_ime_if_visible(), "Dialog fixture did not open the IME"
    xml = capture("dialog-02-ime-dismissed")
    tap_id(CONTRACT["openDialog"], "dialog-open", xml)
    wait_for(lambda: dialog_state(hierarchy()) == "open", "dialog open state")
    xml = capture("dialog-03-open")
    assert_dialog_state(xml, "open")
    tap_id(CONTRACT["closeDialog"], "dialog-close", xml, allow_scroll=False)
    wait_for(lambda: dialog_state(hierarchy()) == "closed", "dialog control close state")
    xml = capture("dialog-04-control-close")
    assert_dialog_state(xml, "closed")
    assert_input_value("Alice", "dialog-control-retained", xml)
    xml = hierarchy()
    tap_id(CONTRACT["openDialog"], "dialog-reopen", xml)
    wait_for(lambda: dialog_state(hierarchy()) == "open", "dialog reopen state")
    shell("input", "keyevent", "KEYCODE_BACK")
    wait_for(lambda: dialog_state(hierarchy()) == "closed", "dialog Back close state")
    xml = capture("dialog-05-back")
    assert_dialog_state(xml, "closed")
    assert_input_value("Alice", "dialog-back-retained", xml)
    assert_foreground()
    return "Dialog closed by control and Android Back while app remained foreground and retained Alice."


def toast(xml):
    tap_id(CONTRACT["showToast"], "toast-show", xml)
    time.sleep(0.5)
    immediate = capture("toast-01-immediate")
    assert "Saved" in immediate, "Saved toast missing immediately"
    time.sleep(6)
    later = capture("toast-02-after-six-seconds")
    assert "Saved" not in later, "Saved remains after six seconds"
    tap_id(CONTRACT["showToastAndNavigate"], "toast-navigate", later)
    wait_for(lambda: node_present(CONTRACT["page2"]), "Page 2 navigation")
    xml = capture("toast-03-navigation")
    select_node(xml, CONTRACT["page2"])
    assert "Saved while navigating" in xml, "Navigation toast missing on Page 2"
    time.sleep(6)
    xml = capture("toast-04-navigation-after-delay")
    assert "Saved while navigating" not in xml, "Navigation toast remains after delay"
    return "Transient toast and one-shot navigation toast passed with Page 2 foreground."


def scale_long(xml):
    tap_id(CONTRACT["showLongToast"], "scale-long-toast", xml)
    time.sleep(0.5)
    xml = capture("scale-01-long-toast")
    assert "The saved changes remain available" in xml, "Long toast content missing"
    return "Long toast found through bounded progress-aware scroll at font_scale=1.5."


def orientation(xml):
    shell("settings", "put", "system", "accelerometer_rotation", "0", retries=2)
    shell("settings", "put", "system", "user_rotation", "1", retries=2)
    time.sleep(2)
    xml = capture("orientation-01-request-landscape")
    assert_foreground()
    return "Requested user_rotation=1; hierarchy rotation=%s. App config declares portrait." % ET.fromstring(xml).get("rotation")


def accessibility(_xml):
    packages = shell("pm", "list", "packages")
    services = shell("dumpsys", "accessibility")
    (OUT / "accessibility-packages.txt").write_text(packages, encoding="utf-8")
    (OUT / "accessibility-services.txt").write_text(services, encoding="utf-8")
    talkback = "com.google.android.marvin.talkback"
    if talkback not in packages:
        return "TalkBack unavailable; no manual screen-reader PASS claimed."
    return "TalkBack package present; service state recorded without claiming manual announcement PASS."


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "device.txt").write_text(shell("getprop", "ro.build.version.sdk") + shell("wm", "size") + shell("getprop", "ro.product.cpu.abi"), encoding="utf-8")
    (OUT / "interaction-contract.json").write_text(json.dumps(CONTRACT, indent=2), encoding="utf-8")
    adb("logcat", "-c")
    cases = [
        ("validation_and_disabled", "Disabled cannot navigate; empty required error persists and clears for Alice.", validation, "1.0"),
        ("dialog_control_and_back", "Dialog opens and closes via control and Android Back.", dialog, "1.0"),
        ("toast_and_navigation", "Toast is transient and navigation still works.", toast, "1.0"),
        ("font_scale_and_long_text", "Long toast remains reachable at font scale 1.5.", scale_long, "1.5"),
        ("orientation_and_safe_area", "Record orientation and bounds after landscape request.", orientation, "1.0"),
        ("accessibility_service", "Record accessibility service availability.", accessibility, "1.0"),
    ]
    try:
        for name, expected, action, font_scale in cases:
            run_case(name, expected, action, font_scale)
    finally:
        (OUT / "logcat.txt").write_bytes(adb("logcat", "-d", "-v", "brief", check=False).stdout)
    return 1 if any(result["status"] == "failure_or_incomplete" for result in RESULTS) else 0


if __name__ == "__main__":
    sys.exit(main())
