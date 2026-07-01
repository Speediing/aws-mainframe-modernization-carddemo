"""Shared pytest fixtures for CardDemo COBOL characterization tests."""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.cbl.coverage import CoverageTracker
from tests.cbl.source import CBL_DIR, discover_cbl_programs


@pytest.fixture(scope="session")
def cbl_dir() -> Path:
    return CBL_DIR


@pytest.fixture(scope="session")
def cbl_program_paths(cbl_dir: Path) -> list[Path]:
    return discover_cbl_programs(cbl_dir)


@pytest.fixture(scope="session")
def coverage_tracker() -> CoverageTracker:
    return CoverageTracker()
