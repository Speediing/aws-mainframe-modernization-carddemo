"""Characterization reach gate for CardDemo COBOL source read coverage."""

from __future__ import annotations

import pytest

from tests.cbl.characterizer import characterize_program
from tests.cbl.source import CBL_DIRS, discover_cbl_programs
from tests.cbl.source_read_coverage import SourceReadCoverageTracker

MINIMUM_CHARACTERIZATION_REACH = 0.80


@pytest.fixture(scope="session")
def populated_source_read_coverage_tracker() -> SourceReadCoverageTracker:
    tracker = SourceReadCoverageTracker()
    for path in discover_cbl_programs(CBL_DIRS):
        characterize_program(path, tracker)
    return tracker


def test_app_cbl_overall_characterization_reach(
    populated_source_read_coverage_tracker: SourceReadCoverageTracker,
) -> None:
    summary = populated_source_read_coverage_tracker.summary()
    assert summary["overall_characterization_reach"] >= MINIMUM_CHARACTERIZATION_REACH, (
        "CardDemo COBOL source read coverage characterization reach is "
        f"{summary['overall_characterization_reach']:.2%} "
        f"({summary['total_covered']}/{summary['total_coverable']}); "
        f"expected >= {MINIMUM_CHARACTERIZATION_REACH:.0%}"
    )


def test_each_program_meets_characterization_reach(
    populated_source_read_coverage_tracker: SourceReadCoverageTracker,
) -> None:
    summary = populated_source_read_coverage_tracker.summary()
    low_characterization_reach = [
        (
            name,
            details["characterization_reach"],
            details["covered"],
            details["coverable"],
        )
        for name, details in summary["per_file"].items()
        if details["characterization_reach"] < MINIMUM_CHARACTERIZATION_REACH
    ]
    assert not low_characterization_reach, (
        f"Programs below {MINIMUM_CHARACTERIZATION_REACH:.0%} "
        f"characterization reach: {low_characterization_reach}"
    )
