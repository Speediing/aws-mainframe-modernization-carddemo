"""Characterization tests for CardDemo COBOL programs in app/cbl/."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from tests.cbl.characterizer import characterize_program, expected_program_id
from tests.cbl.coverage import CoverageTracker
from tests.cbl.source import CBL_DIR, discover_cbl_programs, load_program

PROGRAM_IDS = {
    path.name: expected_program_id(path) for path in discover_cbl_programs(CBL_DIR)
}


@pytest.fixture(scope="session")
def characterized_programs(coverage_tracker: CoverageTracker) -> dict[str, object]:
    programs: dict[str, object] = {}
    for path in discover_cbl_programs(CBL_DIR):
        programs[path.name] = characterize_program(path, coverage_tracker)
    return programs


@pytest.mark.parametrize("program_name", sorted(PROGRAM_IDS))
def test_program_id_matches_filename(program_name: str, characterized_programs) -> None:
    characterization = characterized_programs[program_name]
    assert characterization.program.program_id == PROGRAM_IDS[program_name]
    assert characterization.expected_program_id == PROGRAM_IDS[program_name]


@pytest.mark.parametrize("program_name", sorted(PROGRAM_IDS))
def test_identification_division_present(program_name: str, characterized_programs) -> None:
    characterization = characterized_programs[program_name]
    assert "IDENTIFICATION DIVISION" in characterization.division_names


@pytest.mark.parametrize("program_name", sorted(PROGRAM_IDS))
def test_has_procedure_division(program_name: str, characterized_programs) -> None:
    characterization = characterized_programs[program_name]
    assert characterization.has_procedure_division


@pytest.mark.parametrize("program_name", sorted(PROGRAM_IDS))
def test_copybooks_are_uppercase(program_name: str, characterized_programs) -> None:
    characterization = characterized_programs[program_name]
    for copybook in characterization.copybooks:
        assert copybook == copybook.upper()
        assert copybook.isalnum() or "-" in copybook


@pytest.mark.parametrize("program_name", sorted(PROGRAM_IDS))
def test_paragraph_names_match_cobol_pattern(
    program_name: str, characterized_programs
) -> None:
    characterization = characterized_programs[program_name]
    for name in characterization.paragraph_names:
        assert re.match(r"^[A-Z0-9][A-Z0-9-]*$", name)


def test_batch_programs_have_display_or_perform(
    characterized_programs,
) -> None:
    batch_prefixes = ("CB",)
    for program_name, characterization in characterized_programs.items():
        if not program_name.startswith(batch_prefixes):
            continue
        source = characterization.program.path.read_text(encoding="utf-8", errors="replace")
        assert "PROCEDURE DIVISION" in source
        assert (
            "DISPLAY" in source
            or "PERFORM" in source
            or "CALL" in source
            or "READ" in source
        )


def test_cics_programs_issue_cics_commands(characterized_programs) -> None:
    cics_programs = {
        name: characterization
        for name, characterization in characterized_programs.items()
        if name.startswith("CO") and name not in {"COBSWAIT.cbl"}
    }
    for program_name, characterization in cics_programs.items():
        assert characterization.cics_commands, f"{program_name} should contain EXEC CICS"


def test_cobswait_calls_mvswait(characterized_programs) -> None:
    characterization = characterized_programs["COBSWAIT.cbl"]
    assert characterization.call_targets == ["MVSWAIT"]
    assert characterization.program.program_id == "COBSWAIT"


def test_csutldtc_calls_ceedays(characterized_programs) -> None:
    characterization = characterized_programs["CSUTLDTC.cbl"]
    assert "CEEDAYS" in characterization.call_targets
    assert characterization.has_linkage_section


def test_cbexport_defines_export_files(characterized_programs) -> None:
    characterization = characterized_programs["CBEXPORT.cbl"]
    assert "CUSTOMER-INPUT" in characterization.file_selects
    assert "EXPORT-OUTPUT" in characterization.file_selects


def test_cbimport_defines_import_files(characterized_programs) -> None:
    characterization = characterized_programs["CBIMPORT.cbl"]
    assert "EXPORT-INPUT" in characterization.file_selects
    assert "CUSTOMER-OUTPUT" in characterization.file_selects


def test_coactupc_is_largest_online_program(characterized_programs) -> None:
    coverable_counts = {
        name: len(characterization.program.coverable_line_numbers)
        for name, characterization in characterized_programs.items()
    }
    assert coverable_counts["COACTUPC.cbl"] == max(coverable_counts.values())


@pytest.mark.parametrize(
    ("program_name", "minimum_paragraphs"),
    sorted(
        {
            "CBACT01C.cbl": 10,
            "CBACT04C.cbl": 15,
            "CBEXPORT.cbl": 15,
            "CBIMPORT.cbl": 10,
            "CBSTM03A.CBL": 20,
            "CBTRN02C.cbl": 20,
            "COACTUPC.cbl": 50,
            "COCRDLIC.cbl": 30,
            "COCRDUPC.cbl": 30,
        }.items()
    ),
)
def test_minimum_paragraph_count(
    program_name: str,
    minimum_paragraphs: int,
    characterized_programs,
) -> None:
    characterization = characterized_programs[program_name]
    assert len(characterization.paragraph_names) >= minimum_paragraphs


def test_all_programs_load_without_error(cbl_program_paths: list[Path]) -> None:
    for path in cbl_program_paths:
        program = load_program(path)
        assert program.program_id
        assert program.coverable_line_numbers
