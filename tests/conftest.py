"""Shared pytest fixtures for CardDemo COBOL characterization tests."""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.cbl.source import CBL_DIRS, discover_cbl_programs
from tests.cbl.source_read_coverage import SourceReadCoverageTracker


@pytest.fixture(scope="session")
def cbl_dirs() -> tuple[Path, ...]:
    return CBL_DIRS


@pytest.fixture(scope="session")
def cbl_program_paths(cbl_dirs: tuple[Path, ...]) -> list[Path]:
    return discover_cbl_programs(cbl_dirs)


@pytest.fixture(scope="session")
def source_read_coverage_tracker() -> SourceReadCoverageTracker:
    return SourceReadCoverageTracker()
