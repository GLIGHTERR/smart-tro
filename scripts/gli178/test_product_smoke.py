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
  <node content-desc="Trạng thái Lưu: bị vô hiệu" text="Lưu" enabled="true" bounds="[10,340][300,390]" />
</hierarchy>"""

HOME_XML = """<hierarchy><node text="Xin chào" bounds="[0,0][1,1]" /><node text="Tài khoản: UC-04 — Tài khoản/Cá nhân" bounds="[0,2][1,3]" /></hierarchy>"""
ACCOUNT_XML = """<hierarchy><node text="Tài khoản" bounds="[0,0][1,1]" /><node text="Chỉnh sửa thông tin cá nhân" bounds="[0,2][1,3]" /></hierarchy>"""


class HierarchyTests(unittest.TestCase):
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
        self.assertTrue(matrix["saveDisabledBeforeMutation"])

    def test_field_layout_rejects_overlapping_label_and_input(self):
        overlapping = EDIT_PROFILE_XML.replace('[10,40][300,90]', '[10,25][300,90]')
        with self.assertRaisesRegex(AssertionError, "Overlapping or reversed"):
            product_smoke.assert_field_layout(overlapping, "Họ và tên", "Họ và tên")

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

    def test_product_and_disabled_guards_reject_pilot_wrong_foreground_and_missing_save_accessibility_state(self):
        with self.assertRaisesRegex(AssertionError, "Pilot identifier"):
            product_smoke.assert_product("G1 UI pilot")
        with patch.object(product_smoke, "foreground", return_value={"package": "wrong", "activity": None}):
            with self.assertRaisesRegex(AssertionError, "Expected com.smartplatform.smarttro foreground"):
                product_smoke.assert_product(EDIT_PROFILE_XML)
        with self.assertRaisesRegex(LookupError, "Product UI node not found"):
            product_smoke.assert_save_disabled(EDIT_PROFILE_XML.replace("Trạng thái Lưu: bị vô hiệu", "Trạng thái Lưu: có thể lưu"))

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

    def test_run_captures_normal_focus_and_error_evidence_without_activating_save(self):
        focused = EDIT_PROFILE_XML.replace('focused="false"', 'focused="true"')
        invalid = EDIT_PROFILE_XML.replace('  <node text="Số điện thoại"', '  <node text="Họ và tên là bắt buộc." bounds="[10,91][300,99]" />\n  <node text="Số điện thoại"')
        dumps = [HOME_XML, HOME_XML, ACCOUNT_XML, ACCOUNT_XML, EDIT_PROFILE_XML, EDIT_PROFILE_XML, focused, focused, invalid, invalid]
        png = subprocess.CompletedProcess(["adb"], 0, stdout=b"png", stderr=b"")
        with tempfile.TemporaryDirectory() as directory, patch.object(product_smoke, "OUT", product_smoke.Path(directory)), patch.object(product_smoke, "assert_product_provenance", return_value={"commit": "a" * 40, "package": product_smoke.PACKAGE, "pilot": False}), patch.object(product_smoke, "foreground", return_value={"package": product_smoke.PACKAGE, "activity": ".MainActivity"}), patch.object(product_smoke, "hierarchy", side_effect=dumps), patch.object(product_smoke, "adb", return_value=png), patch.object(product_smoke, "shell") as shell:
            product_smoke.run()
            result = json.loads((product_smoke.Path(directory) / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(result["status"], "PASS")
        self.assertTrue(result["fieldStateMatrix"]["fullName"]["focused"])
        self.assertEqual(result["fieldStateMatrix"]["fullName"]["invalidError"], "Họ và tên là bắt buộc.")
        self.assertEqual(result["mutation"], {"saveActivated": False, "backendChanged": False})
        self.assertNotIn("Lưu", [arg for call in shell.call_args_list for arg in call.args])

    def test_retries_adb_failure_and_preserves_the_last_failure(self):
        failed = subprocess.CalledProcessError(1, ["adb"])
        with patch.object(product_smoke, "shell", side_effect=failed), patch.object(product_smoke.time, "sleep") as sleep:
            with self.assertRaises(subprocess.CalledProcessError):
                product_smoke.hierarchy(retries=1)
        self.assertEqual(sleep.call_count, 1)
