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
FIXTURE = "authorized offline review fixture; Save is tapped only while disabled"
MIN_READABLE_TEXT_HEIGHT = 16
FAILED_SAVE_NOTICES = ("Chưa thể lưu thay đổi. Vui lòng thử lại.", "Không thể lưu thay đổi")


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


def nodes(xml, value):
    root = ET.fromstring(xml)
    return [item for item in root.iter("node") if value in (item.get("text"), item.get("content-desc"))]


def input_node(xml, label, editable=True):
    """Find a Field control by its accessibility label, optionally requiring editable input."""
    matches = nodes(xml, label)
    if editable:
        matches = [item for item in matches if "EditText" in (item.get("class") or "")]
    if not matches:
        raise LookupError(f"Product input not found for accessibility label: {label}")
    return matches[0]


def bounds(item):
    match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", item.get("bounds") or "")
    if not match:
        raise ValueError(f"Invalid UI bounds: {item.get('bounds')!r}")
    return tuple(map(int, match.groups()))


def assert_below(upper, lower, description):
    _, upper_top, _, upper_bottom = bounds(upper)
    _, lower_top, _, _ = bounds(lower)
    if upper_bottom > lower_top:
        raise AssertionError(f"Overlapping or reversed Field layout for {description}: {upper.get('bounds')} then {lower.get('bounds')}")


def assert_readable_text(item, description):
    _, top, _, bottom = bounds(item)
    if bottom - top < MIN_READABLE_TEXT_HEIGHT:
        raise AssertionError(f"Clipped Field text for {description}: {item.get('bounds')} is below {MIN_READABLE_TEXT_HEIGHT}px")


def assert_field_layout(xml, label, input_label, detail=None, editable=True, require_readable_detail=False):
    label_node = next((item for item in ET.fromstring(xml).iter("node") if (item.get("text") or "") in (label, f"{label} *")), None)
    if label_node is None:
        raise LookupError(f"Product Field label not found: {label}")
    control = input_node(xml, input_label, editable=editable)
    assert_below(label_node, control, f"{label} label/input")
    if detail:
        detail_node = node(xml, detail)
        assert_below(control, detail_node, f"{label} input/helper")
        if require_readable_detail:
            assert_readable_text(detail_node, f"{label} helper/error")
    return {"label": label, "input": input_label, "detail": detail, "vertical": True}


def tap(item):
    x1, y1, x2, y2 = bounds(item)
    shell("input", "tap", (x1 + x2) // 2, (y1 + y2) // 2)


def clear_input(item):
    tap(item)
    # The fixture's display name is bounded well below 256 characters. Repeated DEL avoids
    # clipboard or IME state and does not submit or persist any profile data.
    shell("input", "keyevent", "KEYCODE_MOVE_END", *(["KEYCODE_DEL"] * 256))


def assert_product_provenance():
    expected_commit = os.environ.get("GLI178_EXPECTED_COMMIT")
    if not expected_commit or not re.fullmatch(r"[0-9a-f]{40}", expected_commit):
        raise AssertionError("Missing or invalid GLI178_EXPECTED_COMMIT product provenance")
    if os.environ.get("EXPO_PUBLIC_UI_PILOT") != "false":
        raise AssertionError("Product evidence must run with EXPO_PUBLIC_UI_PILOT=false")
    installed = shell("pm", "path", PACKAGE).strip()
    if not installed.startswith("package:"):
        raise AssertionError(f"Expected installed product package {PACKAGE}, got {installed!r}")
    return {"commit": expected_commit, "package": PACKAGE, "pilot": False}


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


def assert_disabled_save_attempt(before, after):
    """Prove the accessible Save is disabled and its tap leaves the fixture untouched."""
    node(after, "Cập nhật thông tin cá nhân")
    for xml, stage in ((before, "before"), (after, "after")):
        if node(xml, "Lưu").get("enabled") != "false":
            raise AssertionError(f"Save must be enabled=false {stage} a disabled-save tap")
    if any(notice in after for notice in FAILED_SAVE_NOTICES):
        raise AssertionError("Disabled Save displayed a failed-save notice")
    if input_node(before, "Họ và tên").get("text") != input_node(after, "Họ và tên").get("text"):
        raise AssertionError("Disabled Save changed the Full name fixture")


def edit_profile_matrix(xml):
    return {
        "fullName": assert_field_layout(xml, "Họ và tên", "Họ và tên"),
        "phone": assert_field_layout(xml, "Số điện thoại", "Số điện thoại", "Không bắt buộc. Ví dụ: 0901234567"),
        "email": assert_field_layout(xml, "Email", "Email chỉ đọc", "Email không thể chỉnh sửa.", editable=False),
    }


def write_failed_result(error):
    """Leave a machine-readable verdict behind when evidence validation fails."""
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "result.json").write_text(json.dumps({
        "status": "FAIL",
        "error": str(error),
        "fixture": FIXTURE,
        "mutation": {"saveControlTappedWhileDisabled": False, "validSaveActivated": False, "backendChanged": False},
    }, indent=2), encoding="utf-8")


def run():
    try:
        return run_matrix()
    except (AssertionError, LookupError, ValueError) as error:
        write_failed_result(error)
        raise


def run_matrix():
    provenance = assert_product_provenance()
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
    capture("03-edit-profile-normal-disabled", edit)
    matrix = edit_profile_matrix(edit)

    tap(node(edit, "Lưu"))
    time.sleep(0.4)
    after_disabled_save = hierarchy()
    assert_product(after_disabled_save)
    assert_disabled_save_attempt(edit, after_disabled_save)
    capture("03a-edit-profile-save-disabled", after_disabled_save)
    matrix["saveDisabledBeforeMutation"] = True

    name_input = input_node(after_disabled_save, "Họ và tên")
    tap(name_input)
    wait_for(lambda: input_node(hierarchy(), "Họ và tên").get("focused") == "true", "Full name focus state")
    focused = hierarchy()
    assert_product(focused)
    matrix["fullName"]["focused"] = True
    capture("04-edit-profile-full-name-focused", focused)

    clear_input(name_input)
    wait_for(lambda: "Họ và tên là bắt buộc." in hierarchy(), "Full name validation error")
    invalid = hierarchy()
    assert_product(invalid)
    capture("05-edit-profile-full-name-error", invalid)
    assert_field_layout(invalid, "Họ và tên", "Họ và tên", "Họ và tên là bắt buộc.", require_readable_detail=True)
    tap(node(invalid, "Lưu"))
    time.sleep(0.4)
    after_invalid_save = hierarchy()
    assert_product(after_invalid_save)
    assert_disabled_save_attempt(invalid, after_invalid_save)
    matrix["fullName"]["invalidError"] = "Họ và tên là bắt buộc."
    matrix["saveDisabledAfterInvalidValue"] = True

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "result.json").write_text(json.dumps({
        "status": "PASS", "entry": "src/App", "flow": ["Home", "Account", "Edit Profile"],
        "provenance": provenance, "fixture": FIXTURE, "mutation": {"saveControlTappedWhileDisabled": True, "validSaveActivated": False, "backendChanged": False},
        "fieldStateMatrix": matrix,
    }, indent=2), encoding="utf-8")


if __name__ == "__main__":  # pragma: no cover - process entry point; run() is unit-covered.
    run()
