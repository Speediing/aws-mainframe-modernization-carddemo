"""Regression characterization for duplicate paragraph labels."""

from tests.cbl.characterizer import characterize_program
from tests.cbl.coverage import CoverageTracker
from tests.cbl.source import CBL_DIR


def test_coactvwc_has_duplicate_main_exit_paragraph() -> None:
    tracker = CoverageTracker()
    path = CBL_DIR / "COACTVWC.cbl"
    characterization = characterize_program(path, tracker)
    assert characterization.paragraph_names.count("0000-MAIN-EXIT") == 2
