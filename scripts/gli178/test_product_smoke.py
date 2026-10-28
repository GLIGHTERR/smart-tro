"""Unit coverage for the retry boundary in the GLI-178 product smoke harness."""
import json
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

from scripts.gli178 import product_smoke


EDIT_PROFILE_XML = """<hierarchy>
  <node text="Cập nhật thông tin cá nhân" bounds="[10,0][300,8]" />
  <node text="Họ và tên" bounds="[10,10][200,30]" />
  <node content-desc="Họ và tên" class="android.widget.EditText" focused="false" bounds="[10,40][300,90]" />
  <node text="Số điện thoại" bounds="[10,100][200,120]" />
  <node content-desc="Số điện thoại" class="android.widget.EditText" bounds="[10,130][300,180]" />
  <node text="Không bắt buộc. Ví dụ: 0901234567" bounds="[10,190][300,210]" />
  <node text="Email" bounds="[10,220][200,240]" />
  <node content-desc="Email chỉ đọc" class="android.widget.TextView" bounds="[10,250][300,300]" />
  <node text="Email không thể chỉnh sửa." bounds="[10,310][300,330]" />
  <node text="Lưu" enabled="false" bounds="[10,340][300,390]" />
</hierarchy>"""

HOME_XML = """<hierarchy><node text="Xin chào" bounds="[0,0][1,1]" /><node text="Tài khoản: UC-04 — Tài khoản/Cá nhân" bounds="[0,2][1,3]" /></hierarchy>"""
ACCOUNT_XML = """<hierarchy><node text="Tài khoản" bounds="[0,0][1,1]" /><node text="Chỉnh sửa thông tin cá nhân" bounds="[0,2][1,3]" /></hierarchy>"""
AUTH_XML = """<hierarchy><node text="Đăng nhập" bounds="[0,0][1,1]" /><node text="Đăng ký" bounds="[0,2][1,3]" /></hierarchy>"""


class HierarchyTests(unittest.TestCase):
    def test_adb_and_shell_preserve_success_and_surface_failures(self):
        successful = subprocess.CompletedProcess(["adb"], 0, stdout=b"ok", stderr=b"")
        failed = subprocess.CompletedProcess(["adb"], 1, stdout=b"", stderr=b"failed")
        with patch.object(product_smoke.subprocess, "run", return_value=successful) as run:
            self.assertIs(product_smoke.adb("version"), successful)
        self.assertEqual(run.call_args.args[0], ["adb", "version"])
        with patch.object(product_smoke.subprocess, "run", return_value=failed):
            with self.assertRaises(subprocess.CalledProcessError):
                product_smoke.adb("version")
            self.assertIs(product_smoke.adb("version", check=False), failed)
        with patch.object(product_smoke, "adb", return_value=successful):
            self.assertEqual(product_smoke.shell("getprop"), "ok")

    def test_foreground_parses_activity_or_reports_no_matching_window(self):
        with patch.object(product_smoke, "shell", side_effect=["mResumedActivity u0 com.smartplatform.smarttro/.MainActivity", ""]):
            self.assertEqual(product_smoke.foreground(), {"package": product_smoke.PACKAGE, "activity": ".MainActivity"})
        with patch.object(product_smoke, "shell", side_effect=["unrelated", "window"]):
            self.assertEqual(product_smoke.foreground(), {"package": None, "activity": None})

    def test_wait_for_retries_then_times_out_with_description(self):
        with patch.object(product_smoke.time, "monotonic", side_effect=[0, 0, 0.1]), patch.object(product_smoke.time, "sleep") as sleep:
            calls = iter([False, True])
            product_smoke.wait_for(lambda: next(calls), "event")
        sleep.assert_called_once_with(0.4)
        with patch.object(product_smoke.time, "monotonic", side_effect=[0, 0, 1]), patch.object(product_smoke.time, "sleep"):
            with self.assertRaisesRegex(TimeoutError, "missing event"):
                product_smoke.wait_for(lambda: False, "missing event", timeout=1)

    def test_retries_an_incomplete_dump_then_returns_verified_xml(self):
        incomplete = subprocess.CompletedProcess(["adb"], 0, stdout=b"", stderr=b"")
        complete = subprocess.CompletedProcess(["adb"], 0, stdout=b"<hierarchy />", stderr=b"")
        with patch.object(product_smoke, "shell"), patch.object(product_smoke, "adb", side_effect=[incomplete, complete]) as adb, patch.object(product_smoke.time, "sleep") as sleep:
            self.assertEqual(product_smoke.hierarchy(), "<hierarchy />")
        self.assertEqual(adb.call_count, 2)
        sleep.assert_called_once_with(0.4)

    def test_raises_the_last_parse_error_after_bounded_retries(self):
        malformed = subprocess.CompletedProcess(["adb"], 0, stdout=b"not xml", stderr=b"")
        with patch.object(product_smoke, "shell"), patch.object(product_smoke, "adb", return_value=malformed), patch.object(product_smoke.time, "sleep") as sleep:
            with self.assertRaises(ET.ParseError):
                product_smoke.hierarchy(retries=1)
        self.assertEqual(sleep.call_count, 1)


class FieldMatrixTests(unittest.TestCase):
    def test_edit_profile_matrix_proves_all_fields_are_vertical_and_save_is_disabled(self):
        matrix = product_smoke.edit_profile_matrix(EDIT_PROFILE_XML)
        self.assertEqual(matrix["fullName"]["input"], "Họ và tên")
        self.assertEqual(matrix["phone"]["detail"], "Không bắt buộc. Ví dụ: 0901234567")
        self.assertTrue(matrix["email"]["vertical"])
        self.assertNotIn("saveDisabledBeforeMutation", matrix)

    def test_field_layout_rejects_overlapping_label_and_input(self):
        overlapping = EDIT_PROFILE_XML.replace('[10,40][300,90]', '[10,25][300,90]')
        with self.assertRaisesRegex(AssertionError, "Overlapping or reversed"):
            product_smoke.assert_field_layout(overlapping, "Họ và tên", "Họ và tên")

    def test_field_layout_rejects_a_clipped_error_while_the_keyboard_is_visible(self):
        clipped = EDIT_PROFILE_XML.replace('  <node text="Số điện thoại"', '  <node text="Họ và tên là bắt buộc." bounds="[10,91][300,94]" />\n  <node text="Số điện thoại"')
        with self.assertRaisesRegex(AssertionError, "Clipped Field text"):
            product_smoke.assert_field_layout(clipped, "Họ và tên", "Họ và tên", "Họ và tên là bắt buộc.", require_readable_detail=True)

    def test_field_layout_accepts_the_existing_required_marker(self):
        required = EDIT_PROFILE_XML.replace('text="Họ và tên" bounds="[10,10][200,30]"', 'text="Họ và tên *" bounds="[10,10][200,30]"')
        self.assertTrue(product_smoke.assert_field_layout(required, "Họ và tên", "Họ và tên")["vertical"])

    def test_missing_matrix_state_fails_clearly(self):
        missing_helper = EDIT_PROFILE_XML.replace('  <node text="Không bắt buộc. Ví dụ: 0901234567" bounds="[10,190][300,210]" />\n', "")
        with self.assertRaisesRegex(LookupError, "Product UI node not found"):
            product_smoke.edit_profile_matrix(missing_helper)

    def test_layout_helpers_reject_missing_controls_labels_and_bounds(self):
        with self.assertRaisesRegex(LookupError, "Product input not found"):
            product_smoke.input_node(EDIT_PROFILE_XML, "Missing")
        with self.assertRaisesRegex(LookupError, "Product Field label not found"):
            product_smoke.assert_field_layout(EDIT_PROFILE_XML, "Missing", "Họ và tên")
        with self.assertRaisesRegex(ValueError, "Invalid UI bounds"):
            product_smoke.bounds(ET.fromstring('<node bounds="bad" />'))

    def test_product_and_disabled_guards_reject_pilot_wrong_foreground_and_mutating_disabled_save(self):
        with self.assertRaisesRegex(AssertionError, "Pilot identifier"):
            product_smoke.assert_product("G1 UI pilot")
        with patch.object(product_smoke, "foreground", return_value={"package": "wrong", "activity": None}):
            with self.assertRaisesRegex(AssertionError, "Expected com.smartplatform.smarttro foreground"):
                product_smoke.assert_product(EDIT_PROFILE_XML)
        changed = EDIT_PROFILE_XML.replace('content-desc="Họ và tên" class="android.widget.EditText" focused="false"', 'content-desc="Họ và tên" class="android.widget.EditText" text="Mai An" focused="false"')
        with self.assertRaisesRegex(AssertionError, "Disabled Save changed"):
            product_smoke.assert_disabled_save_attempt(EDIT_PROFILE_XML, changed)

    def test_disabled_save_guard_rejects_enabled_accessible_control_before_or_after_tap(self):
        enabled = EDIT_PROFILE_XML.replace('enabled="false"', 'enabled="true"')
        with self.assertRaisesRegex(AssertionError, "enabled=false before"):
            product_smoke.assert_disabled_save_attempt(enabled, EDIT_PROFILE_XML)
        with self.assertRaisesRegex(AssertionError, "enabled=false after"):
            product_smoke.assert_disabled_save_attempt(EDIT_PROFILE_XML, enabled)

    def test_disabled_save_guard_rejects_failed_save_notice_after_tap(self):
        failed = EDIT_PROFILE_XML.replace("</hierarchy>", '  <node text="Chưa thể lưu thay đổi. Vui lòng thử lại." />\n</hierarchy>')
        with self.assertRaisesRegex(AssertionError, "failed-save notice"):
            product_smoke.assert_disabled_save_attempt(EDIT_PROFILE_XML, failed)

    def test_clear_input_uses_delete_keys_without_saving(self):
        item = product_smoke.input_node(EDIT_PROFILE_XML, "Họ và tên")
        with patch.object(product_smoke, "shell") as shell:
            product_smoke.clear_input(item)
        self.assertEqual(shell.call_args_list[0].args[:3], ("input", "tap", 155))
        self.assertEqual(shell.call_args_list[1].args[:3], ("input", "keyevent", "KEYCODE_MOVE_END"))
        self.assertNotIn("Lưu", shell.call_args_list[1].args)


class ProvenanceTests(unittest.TestCase):
    def test_requires_exact_product_commit_flag_and_installed_package(self):
        with patch.dict(product_smoke.os.environ, {"GLI178_EXPECTED_COMMIT": "a" * 40, "EXPO_PUBLIC_UI_PILOT": "false"}, clear=True), patch.object(product_smoke, "shell", return_value="package:/data/app/base.apk\n"):
            self.assertEqual(product_smoke.assert_product_provenance(), {"commit": "a" * 40, "package": product_smoke.PACKAGE, "pilot": False})

    def test_rejects_missing_or_invalid_provenance(self):
        with patch.dict(product_smoke.os.environ, {}, clear=True):
            with self.assertRaisesRegex(AssertionError, "GLI178_EXPECTED_COMMIT"):
                product_smoke.assert_product_provenance()
        with patch.dict(product_smoke.os.environ, {"GLI178_EXPECTED_COMMIT": "a" * 40, "EXPO_PUBLIC_UI_PILOT": "true"}, clear=True):
            with self.assertRaisesRegex(AssertionError, "EXPO_PUBLIC_UI_PILOT=false"):
                product_smoke.assert_product_provenance()

    def test_rejects_wrong_installed_package(self):
        with patch.dict(product_smoke.os.environ, {"GLI178_EXPECTED_COMMIT": "a" * 40, "EXPO_PUBLIC_UI_PILOT": "false"}, clear=True), patch.object(product_smoke, "shell", return_value=""):
            with self.assertRaisesRegex(AssertionError, "Expected installed product package"):
                product_smoke.assert_product_provenance()

    def test_run_captures_the_clean_unauthenticated_entry_without_touching_backend_data(self):
        dumps = [AUTH_XML, AUTH_XML]
        png = subprocess.CompletedProcess(["adb"], 0, stdout=b"png", stderr=b"")
        with tempfile.TemporaryDirectory() as directory, patch.object(product_smoke, "OUT", product_smoke.Path(directory)), patch.object(product_smoke, "assert_product_provenance", return_value={"commit": "a" * 40, "package": product_smoke.PACKAGE, "pilot": False}), patch.object(product_smoke, "foreground", return_value={"package": product_smoke.PACKAGE, "activity": ".MainActivity"}), patch.object(product_smoke, "hierarchy", side_effect=dumps), patch.object(product_smoke, "adb", return_value=png), patch.object(product_smoke, "shell"):
            product_smoke.run()
            result = json.loads((product_smoke.Path(directory) / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["flow"], ["Auth", "Đăng ký"])
        self.assertEqual(result["mutation"], {"backendChanged": False})

    def test_run_rejects_an_authenticated_review_home_at_clean_entry(self):
        unsafe_auth = AUTH_XML.replace("</hierarchy>", '<node text="Xin chào" bounds="[0,4][1,5]" /></hierarchy>')
        dumps = [unsafe_auth, unsafe_auth]
        png = subprocess.CompletedProcess(["adb"], 0, stdout=b"png", stderr=b"")
        with tempfile.TemporaryDirectory() as directory, patch.object(product_smoke, "OUT", product_smoke.Path(directory)), patch.object(product_smoke, "assert_product_provenance", return_value={"commit": "a" * 40, "package": product_smoke.PACKAGE, "pilot": False}), patch.object(product_smoke, "foreground", return_value={"package": product_smoke.PACKAGE, "activity": ".MainActivity"}), patch.object(product_smoke, "hierarchy", side_effect=dumps), patch.object(product_smoke, "adb", return_value=png), patch.object(product_smoke, "shell"):
            with self.assertRaisesRegex(AssertionError, "Unauthenticated product entry"):
                product_smoke.run()
            result = json.loads((product_smoke.Path(directory) / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(result["status"], "FAIL")
        self.assertIn("Unauthenticated product entry", result["error"])

    def test_retries_adb_failure_and_preserves_the_last_failure(self):
        failed = subprocess.CalledProcessError(1, ["adb"])
        with patch.object(product_smoke, "shell", side_effect=failed), patch.object(product_smoke.time, "sleep") as sleep:
            with self.assertRaises(subprocess.CalledProcessError):
                product_smoke.hierarchy(retries=1)
        self.assertEqual(sleep.call_count, 1)
