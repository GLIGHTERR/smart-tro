import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import call, patch

from scripts.gli156 import android_interactions as interaction


FIXTURES = json.loads((Path(__file__).parent / "fixtures/failure-artifacts.json").read_text())


class ContractAndArtifactFixtureTests(unittest.TestCase):
    def test_contract_is_unique_and_covers_every_harness_control(self):
        expected = {
            "page1", "page2", "nameInput", "validate", "disabled", "openDialog",
            "closeDialog", "showToast", "showLongToast", "showToastAndNavigate", "goBack",
        }
        self.assertEqual(set(interaction.CONTRACT), expected)
        self.assertEqual(len(set(interaction.CONTRACT.values())), len(expected))

    def test_real_failure_fixtures_cover_all_known_classes(self):
        self.assertEqual(set(FIXTURES["provenance"]), {
            "imeViewport", "launcherForeground", "staleLabel", "offViewport",
            "fontScale", "inputConsumedGesture", "edgeClippedControl", "nonScrollableModal",
        })
        self.assertTrue(interaction.ime_visible(FIXTURES["imeOpen"]))
        self.assertFalse(interaction.ime_visible(FIXTURES["imeClosed"]))
        self.assertEqual(interaction.foreground_state(FIXTURES["appWindow"])["package"], interaction.PACKAGE)
        self.assertEqual(interaction.foreground_state(FIXTURES["appActivity"])["package"], interaction.PACKAGE)
        self.assertNotEqual(interaction.foreground_state(FIXTURES["launcherWindow"])["package"], interaction.PACKAGE)
        with self.assertRaises(LookupError):
            interaction.select_node(FIXTURES["initialHierarchy"], interaction.CONTRACT["showLongToast"])
        interaction.select_node(FIXTURES["scrolledHierarchy"], interaction.CONTRACT["showLongToast"])
        interaction.select_node(FIXTURES["scrolledHierarchy"], interaction.CONTRACT["showToastAndNavigate"])
        self.assertEqual(FIXTURES["fontScale"], "1.5")


class ParsingAndStateTests(unittest.TestCase):
    def test_select_node_accepts_prefixed_resource_id_and_prefers_clickable(self):
        identifier = interaction.CONTRACT["nameInput"]
        xml = f'<hierarchy><node resource-id="{identifier}" bounds="[1,1][2,2]"/><node resource-id="pkg:id/{identifier}" clickable="true" bounds="[10,20][30,40]"/></hierarchy>'
        self.assertEqual(interaction.center(interaction.select_node(xml, identifier).get("bounds")), (20, 30))

    def test_select_node_and_center_reject_invalid_input(self):
        with self.assertRaises(LookupError):
            interaction.select_node("<hierarchy/>", "missing")
        with self.assertRaises(Exception):
            interaction.select_node("<hierarchy>", "missing")
        for bounds in (None, "", "[x,0][1,1]", "[0,0][0,1]", "[5,5][4,6]"):
            with self.subTest(bounds=bounds), self.assertRaises(ValueError):
                interaction.center(bounds)
        self.assertEqual(interaction.center("[0,1][1,2]"), (0, 1))

    def test_actionable_control_rejects_edge_clipped_artifact_node(self):
        clipped = interaction.select_node(FIXTURES["clippedControlHierarchy"], interaction.CONTRACT["openDialog"])
        revealed = interaction.select_node(FIXTURES["revealedControlHierarchy"], interaction.CONTRACT["openDialog"])
        self.assertFalse(interaction.actionable_in_viewport(clipped, FIXTURES["clippedControlHierarchy"]))
        self.assertTrue(interaction.actionable_in_viewport(revealed, FIXTURES["revealedControlHierarchy"]))

    def test_modal_control_uses_fixed_content_viewport(self):
        node = interaction.select_node(FIXTURES["modalHierarchy"], interaction.CONTRACT["closeDialog"])
        viewport, kind = interaction.interaction_viewport(FIXTURES["modalHierarchy"])
        self.assertEqual(kind, "fixed")
        self.assertEqual(viewport.get("resource-id"), "android:id/content")
        self.assertTrue(interaction.actionable_in_viewport(node, FIXTURES["modalHierarchy"]))

    def test_dialog_lifecycle_distinguishes_open_closed_and_inconsistent(self):
        self.assertEqual(interaction.dialog_state(FIXTURES["modalHierarchy"]), "open")
        self.assertEqual(interaction.dialog_state(FIXTURES["closedDialogHierarchy"]), "closed")
        self.assertEqual(interaction.dialog_state(FIXTURES["modalMissingCloseHierarchy"]), "inconsistent")
        interaction.assert_dialog_state(FIXTURES["modalHierarchy"], "open")
        with self.assertRaisesRegex(AssertionError, "got inconsistent"):
            interaction.assert_dialog_state(FIXTURES["modalMissingCloseHierarchy"], "open")

    def test_foreground_and_ime_parsing_include_unknown_states(self):
        self.assertEqual(interaction.foreground_state("nothing"), {"package": None, "activity": None})
        self.assertTrue(interaction.ime_visible("inputShown=true"))
        self.assertFalse(interaction.ime_visible("inputShown=false"))

    def test_adb_raises_only_when_requested(self):
        failed = subprocess.CompletedProcess(["adb"], 1, stdout=b"out", stderr=b"err")
        with patch.object(interaction.subprocess, "run", return_value=failed):
            self.assertEqual(interaction.adb("version", check=False).returncode, 1)
            with self.assertRaises(subprocess.CalledProcessError):
                interaction.adb("version")

    def test_adb_retries_only_when_the_caller_marks_an_operation_idempotent(self):
        failed = subprocess.CompletedProcess(["adb"], 1, stdout=b"", stderr=b"offline")
        passed = subprocess.CompletedProcess(["adb"], 0, stdout=b"ok", stderr=b"")
        with patch.object(interaction.subprocess, "run", side_effect=[failed, passed]) as run, patch.object(interaction.time, "sleep"):
            self.assertEqual(interaction.adb("shell", "settings", retries=1).stdout, b"ok")
            self.assertEqual(run.call_count, 2)
        with patch.object(interaction.subprocess, "run", return_value=failed) as run, patch.object(interaction.time, "sleep"):
            with self.assertRaises(subprocess.CalledProcessError):
                interaction.adb("shell", "settings")
            run.assert_called_once()

    def test_wait_for_success_and_timeout(self):
        predicate = unittest.mock.Mock(side_effect=[False, True])
        with patch.object(interaction.time, "sleep"), patch.object(interaction.time, "monotonic", side_effect=[0, 0, 0.1]):
            interaction.wait_for(predicate, "condition", timeout=1)
        with patch.object(interaction.time, "sleep"), patch.object(interaction.time, "monotonic", side_effect=[0, 0, 2]):
            with self.assertRaises(TimeoutError):
                interaction.wait_for(lambda: False, "condition", timeout=1)

    def test_assert_foreground_accepts_app_and_rejects_launcher(self):
        with patch.object(interaction, "foreground_state", return_value={"package": interaction.PACKAGE, "activity": ".MainActivity"}):
            self.assertEqual(interaction.assert_foreground()["package"], interaction.PACKAGE)
        with patch.object(interaction, "foreground_state", return_value={"package": "launcher", "activity": ".Home"}):
            with self.assertRaises(AssertionError):
                interaction.assert_foreground()

    def test_wait_for_foreground_allows_transient_launcher_then_requires_app(self):
        states = [
            {"package": "com.google.android.apps.nexuslauncher", "activity": ".NexusLauncherActivity"},
            {"package": interaction.PACKAGE, "activity": ".MainActivity"},
            {"package": interaction.PACKAGE, "activity": ".MainActivity"},
        ]
        with patch.object(interaction, "foreground_state", side_effect=states), patch.object(interaction.time, "sleep"):
            self.assertEqual(interaction.wait_for_foreground()["package"], interaction.PACKAGE)

    def test_node_present_handles_found_missing_malformed_and_adb_failure(self):
        identifier = interaction.CONTRACT["page1"]
        with patch.object(interaction, "hierarchy", return_value=f'<hierarchy><node resource-id="{identifier}"/></hierarchy>'):
            self.assertTrue(interaction.node_present(identifier))
        for failure in ("<hierarchy/>", "<hierarchy>", subprocess.CalledProcessError(1, ["adb"])):
            with self.subTest(failure=failure), patch.object(interaction, "hierarchy", side_effect=failure if isinstance(failure, Exception) else None, return_value=None if isinstance(failure, Exception) else failure):
                self.assertFalse(interaction.node_present(identifier))


class ResetAndScrollTests(unittest.TestCase):
    def test_restore_defaults_verifies_all_settings(self):
        with patch.object(interaction, "shell") as shell, patch.object(interaction, "read_setting", side_effect=lambda _namespace, key: {"font_scale": "1.0", "user_rotation": "0", "accelerometer_rotation": "1"}[key]):
            interaction.restore_device_defaults()
        shell.assert_has_calls([
            call("settings", "put", "system", "font_scale", "1.0", retries=2),
            call("settings", "put", "system", "user_rotation", "0", retries=2),
            call("settings", "put", "system", "accelerometer_rotation", "1", retries=2),
        ])
    def test_dismiss_ime_never_sends_back_from_launcher_or_when_closed(self):
        with patch.object(interaction, "foreground_state", return_value={"package": "launcher"}), patch.object(interaction, "ime_visible", return_value=True), patch.object(interaction, "shell") as shell:
            self.assertFalse(interaction.dismiss_ime_if_visible())
            shell.assert_not_called()
        with patch.object(interaction, "foreground_state", return_value={"package": interaction.PACKAGE}), patch.object(interaction, "ime_visible", return_value=False), patch.object(interaction, "shell") as shell:
            self.assertFalse(interaction.dismiss_ime_if_visible())
            shell.assert_not_called()

    def test_dismiss_ime_verifies_postconditions(self):
        with patch.object(interaction, "foreground_state", return_value={"package": interaction.PACKAGE}), patch.object(interaction, "ime_visible", side_effect=[True, False]), patch.object(interaction, "shell") as shell, patch.object(interaction, "assert_foreground") as foreground:
            self.assertTrue(interaction.dismiss_ime_if_visible())
        shell.assert_called_once_with("input", "keyevent", "KEYCODE_BACK")
        foreground.assert_called_once()

    def test_teardown_dismisses_resets_stops_and_verifies(self):
        with patch.object(interaction, "dismiss_ime_if_visible") as dismiss, patch.object(interaction, "restore_device_defaults") as restore, patch.object(interaction, "shell") as shell, patch.object(interaction, "foreground_state", return_value={"package": "launcher"}):
            interaction.teardown_case()
        dismiss.assert_called_once()
        restore.assert_called_once()
        shell.assert_called_once_with("am", "force-stop", interaction.PACKAGE, retries=2)

    def test_prepare_case_sets_and_verifies_every_state(self):
        xml = f'<hierarchy><node resource-id="{interaction.CONTRACT["page1"]}"/><node resource-id="{interaction.CONTRACT["nameInput"]}"/></hierarchy>'
        with patch.object(interaction, "restore_device_defaults") as restore, patch.object(interaction, "dismiss_ime_if_visible"), patch.object(interaction, "shell") as shell, patch.object(interaction, "foreground_state", return_value={"package": interaction.PACKAGE}), patch.object(interaction, "read_setting", return_value="1.5"), patch.object(interaction, "node_present", return_value=True), patch.object(interaction, "capture", return_value=xml), patch.object(interaction, "assert_foreground") as foreground, patch.object(interaction, "ime_visible", return_value=False):
            self.assertEqual(interaction.prepare_case("scale", "1.5"), xml)
        restore.assert_called_once()
        shell.assert_has_calls([
            call("settings", "put", "system", "font_scale", "1.5", retries=2),
            call("am", "force-stop", interaction.PACKAGE, retries=2),
            call("am", "start", "-W", "-n", interaction.ACTIVITY, retries=2),
        ])
        foreground.assert_called_once()

    def test_prepare_case_rejects_unexpected_ime(self):
        xml = f'<hierarchy><node resource-id="{interaction.CONTRACT["page1"]}"/><node resource-id="{interaction.CONTRACT["nameInput"]}"/></hierarchy>'
        with patch.object(interaction, "restore_device_defaults"), patch.object(interaction, "dismiss_ime_if_visible"), patch.object(interaction, "shell"), patch.object(interaction, "foreground_state", return_value={"package": interaction.PACKAGE}), patch.object(interaction, "read_setting", return_value="1.0"), patch.object(interaction, "node_present", return_value=True), patch.object(interaction, "capture", return_value=xml), patch.object(interaction, "assert_foreground"), patch.object(interaction, "ime_visible", return_value=True):
            with self.assertRaises(AssertionError):
                interaction.prepare_case("case")

    def test_scroll_gesture_uses_scrollview_edge_outside_input(self):
        gesture = interaction.scroll_gesture(FIXTURES["initialHierarchy"])
        self.assertEqual(gesture[0], 308)
        self.assertEqual(gesture[0], gesture[2])
        self.assertGreater(gesture[1], gesture[3])
        with self.assertRaises(LookupError):
            interaction.scroll_gesture("<hierarchy/>")
        with self.assertRaises(ValueError):
            interaction.scroll_gesture('<hierarchy><node scrollable="true" bounds="bad"/></hierarchy>')

    def test_find_control_scrolls_requeries_and_records_evidence(self):
        identifier = interaction.CONTRACT["showLongToast"]
        with patch.object(interaction, "capture") as capture, patch.object(interaction, "assert_foreground"), patch.object(interaction, "shell") as shell, patch.object(interaction, "hierarchy", side_effect=[FIXTURES["initialHierarchy"], FIXTURES["scrolledHierarchy"]]), patch.object(interaction.time, "sleep"):
            node = interaction.find_control(identifier, "fixture", FIXTURES["initialHierarchy"])
        self.assertEqual(node.get("resource-id"), identifier)
        shell.assert_called_once_with("input", "swipe", 308, 498, 308, 142, "350")
        self.assertEqual(capture.call_count, 3)

    def test_find_control_scrolls_until_edge_clipped_node_is_safe(self):
        identifier = interaction.CONTRACT["openDialog"]
        with patch.object(interaction, "capture"), patch.object(interaction, "assert_foreground"), patch.object(interaction, "shell") as shell, patch.object(interaction, "hierarchy", return_value=FIXTURES["revealedControlHierarchy"]), patch.object(interaction.time, "sleep"):
            node = interaction.find_control(identifier, "fixture", FIXTURES["clippedControlHierarchy"])
        self.assertEqual(node.get("bounds"), "[24,510][296,557]")
        shell.assert_called_once_with("input", "swipe", 308, 498, 308, 142, "350")

    def test_find_control_accepts_modal_control_without_scroll_fallback(self):
        with patch.object(interaction, "capture"), patch.object(interaction, "assert_foreground"), patch.object(interaction, "shell") as shell:
            node = interaction.find_control(
                interaction.CONTRACT["closeDialog"], "dialog-close",
                FIXTURES["modalHierarchy"], allow_scroll=False,
            )
        self.assertEqual(node.get("resource-id"), interaction.CONTRACT["closeDialog"])
        shell.assert_not_called()

    def test_find_control_refreshes_stale_xml_before_recovery(self):
        with patch.object(interaction, "capture"), patch.object(interaction, "assert_foreground"), patch.object(interaction, "hierarchy", return_value=FIXTURES["modalHierarchy"]), patch.object(interaction, "shell") as shell:
            node = interaction.find_control(
                interaction.CONTRACT["closeDialog"], "dialog-close",
                FIXTURES["closedDialogHierarchy"], allow_scroll=False,
            )
        self.assertEqual(node.get("resource-id"), interaction.CONTRACT["closeDialog"])
        shell.assert_not_called()

    def test_find_control_rejects_absent_modal_control_without_scrolling(self):
        with patch.object(interaction, "capture"), patch.object(interaction, "assert_foreground"), patch.object(interaction, "hierarchy", return_value=FIXTURES["modalMissingCloseHierarchy"]), patch.object(interaction, "shell") as shell:
            with self.assertRaisesRegex(LookupError, "dialog_state=inconsistent"):
                interaction.find_control(
                    interaction.CONTRACT["closeDialog"], "dialog-close",
                    FIXTURES["modalMissingCloseHierarchy"], allow_scroll=False,
                )
        shell.assert_not_called()

    def test_find_control_stops_after_repeated_no_progress(self):
        with patch.object(interaction, "capture"), patch.object(interaction, "assert_foreground"), patch.object(interaction, "shell"), patch.object(interaction, "hierarchy", return_value=FIXTURES["initialHierarchy"]), patch.object(interaction.time, "sleep"):
            with self.assertRaisesRegex(LookupError, "scroll stopped"):
                interaction.find_control("missing", "fixture", FIXTURES["initialHierarchy"], max_swipes=5)

    def test_find_control_honors_bound_and_tap_verifies_foreground(self):
        with patch.object(interaction, "capture"), patch.object(interaction, "assert_foreground"), patch.object(interaction, "select_node", side_effect=LookupError("missing")), patch.object(interaction, "hierarchy", return_value=FIXTURES["initialHierarchy"]):
            with self.assertRaises(LookupError):
                interaction.find_control("missing", "fixture", FIXTURES["initialHierarchy"], max_swipes=0)
        node = interaction.select_node(FIXTURES["initialHierarchy"], interaction.CONTRACT["validate"])
        with patch.object(interaction, "find_control", return_value=node), patch.object(interaction, "shell") as shell, patch.object(interaction, "wait_for_foreground") as foreground:
            interaction.tap_id(interaction.CONTRACT["validate"], "tap")
        shell.assert_called_once_with("input", "tap", 160, 410)
        foreground.assert_called_once()


class EvidenceAndRunnerTests(unittest.TestCase):
    def test_capture_writes_xml_state_and_raw_diagnostics(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(interaction, "OUT", Path(directory)), patch.object(interaction, "adb") as adb, patch.object(interaction, "shell") as shell:
            adb.return_value.stdout = b"png"
            shell.side_effect = [FIXTURES["appWindow"], FIXTURES["appActivity"], FIXTURES["imeClosed"], "1.0", "1", "0"]
            interaction.capture("step", FIXTURES["initialHierarchy"])
            state = json.loads((Path(directory) / "step.state.json").read_text())
            self.assertEqual(state["foreground"]["package"], interaction.PACKAGE)
            self.assertFalse(state["imeVisible"])
            self.assertTrue((Path(directory) / "step.png").exists())

    def test_run_case_records_success_failure_and_restores_state(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(interaction, "OUT", Path(directory)), patch.object(interaction, "RESULTS", []), patch.object(interaction, "prepare_case", return_value="xml"), patch.object(interaction, "teardown_case") as teardown, patch.object(interaction, "capture"):
            interaction.run_case("ok", "expected", lambda xml: xml)
            interaction.run_case("bad", "expected", lambda _xml: 1 / 0)
            self.assertEqual([row["status"] for row in interaction.RESULTS], ["observed", "failure_or_incomplete"])
            self.assertEqual(teardown.call_count, 2)
            self.assertIn("division by zero", (Path(directory) / "results.json").read_text())

    def test_run_case_records_teardown_failure_without_losing_case_result(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(interaction, "OUT", Path(directory)), patch.object(interaction, "RESULTS", []), patch.object(interaction, "prepare_case", return_value="xml"), patch.object(interaction, "teardown_case", side_effect=RuntimeError("settings unavailable")), patch.object(interaction, "capture"):
            interaction.run_case("ok", "expected", lambda xml: xml)
            self.assertEqual(interaction.RESULTS[0]["status"], "failure_or_incomplete")
            self.assertIn("Teardown failed", interaction.RESULTS[0]["actual"])

    def test_main_continues_all_cases_and_returns_failure(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(interaction, "OUT", Path(directory)), patch.object(interaction, "RESULTS", [{"status": "failure_or_incomplete"}]), patch.object(interaction, "shell", return_value=""), patch.object(interaction, "adb") as adb, patch.object(interaction, "run_case") as run_case, patch.object(interaction, "teardown_case"):
            adb.return_value.stdout = b""
            self.assertEqual(interaction.main(), 1)
            self.assertEqual(run_case.call_count, 6)


if __name__ == "__main__":
    unittest.main()
