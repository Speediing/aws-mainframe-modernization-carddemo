"""Coverage gate for app/cbl/ characterization tests."""

from __future__ import annotations

import pytest

from tests.cbl.characterizer import characterize_program
from tests.cbl.coverage import CoverageTracker
from tests.cbl.source import CBL_DIR, discover_cbl_programs

MINIMUM_LINE_COVERAGE = 0.80


@pytest.fixture(scope="session")
def populated_coverage_tracker() -> CoverageTracker:
    tracker = CoverageTracker()
    for path in discover_cbl_programs(CBL_DIR):
        characterize_program(path, tracker)
    return tracker


def test_app_cbl_overall_line_coverage(populated_coverage_tracker: CoverageTracker) -> None:
    summary = populated_coverage_tracker.summary()
    assert summary["overall_ratio"] >= MINIMUM_LINE_COVERAGE, (
        "app/cbl/ line coverage is "
        f"{summary['overall_ratio']:.2%} "
        f"({summary['total_covered']}/{summary['total_coverable']}); "
        f"expected >= {MINIMUM_LINE_COVERAGE:.0%}"
    )


def test_each_program_meets_line_coverage(populated_coverage_tracker: CoverageTracker) -> None:
    summary = populated_coverage_tracker.summary()
    low_coverage = [
        (name, details["ratio"], details["covered"], details["coverable"])
        for name, details in summary["per_file"].items()
        if details["ratio"] < MINIMUM_LINE_COVERAGE
    ]
    assert not low_coverage, f"Programs below {MINIMUM_LINE_COVERAGE:.0%}: {low_coverage}"
