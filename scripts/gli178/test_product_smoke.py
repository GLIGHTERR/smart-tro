"""Unit coverage for the retry boundary in the GLI-178 product smoke harness."""
import subprocess
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

from scripts.gli178 import product_smoke


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

    def test_retries_adb_failure_and_preserves_the_last_failure(self):
        failed = subprocess.CalledProcessError(1, ["adb"])
        with patch.object(product_smoke, "shell", side_effect=failed), patch.object(product_smoke.time, "sleep") as sleep:
            with self.assertRaises(subprocess.CalledProcessError):
                product_smoke.hierarchy(retries=1)
        self.assertEqual(sleep.call_count, 1)
