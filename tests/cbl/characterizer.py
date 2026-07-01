"""Characterization extraction for CardDemo COBOL programs."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from tests.cbl.coverage import CoverageTracker
from tests.cbl.source import CblProgram, load_program


@dataclass
class ProgramCharacterization:
    program: CblProgram
    expected_program_id: str
    division_names: list[str] = field(default_factory=list)
    copybooks: list[str] = field(default_factory=list)
    file_selects: list[str] = field(default_factory=list)
    call_targets: list[str] = field(default_factory=list)
    cics_commands: list[str] = field(default_factory=list)
    paragraph_names: list[str] = field(default_factory=list)
    data_item_names: list[str] = field(default_factory=list)
    has_procedure_division: bool = False
    has_working_storage: bool = False
    has_linkage_section: bool = False


def expected_program_id(path: Path) -> str:
    stem = path.stem.upper()
    if stem.endswith("C"):
        return stem
    return stem


def characterize_program(path: Path, tracker: CoverageTracker) -> ProgramCharacterization:
    program = load_program(path)
    tracker.programs[program.name] = program
    tracker.covered.setdefault(program.name, set())

    characterization = ProgramCharacterization(
        program=program,
        expected_program_id=expected_program_id(path),
        division_names=list(program.divisions.keys()),
        copybooks=[name for _, name in program.copybooks],
        file_selects=[name for _, name in program.file_selects],
        call_targets=[name for _, name in program.call_targets],
        cics_commands=[name for _, name in program.cics_commands],
        paragraph_names=[paragraph.name for paragraph in program.paragraphs],
        data_item_names=[name for _, name in program.data_items],
        has_procedure_division="PROCEDURE DIVISION" in program.divisions,
        has_working_storage=any(
            "WORKING-STORAGE SECTION" in line.content.upper()
            for line in program.lines
            if line.coverable
        ),
        has_linkage_section=any(
            "LINKAGE SECTION" in line.content.upper()
            for line in program.lines
            if line.coverable
        ),
    )

    _cover_identification(program, tracker)
    _cover_environment(program, tracker)
    _cover_data_division(program, tracker)
    _cover_procedure_division(program, tracker)

    return characterization


def _cover_identification(program: CblProgram, tracker: CoverageTracker) -> None:
    bounds = program.divisions.get("IDENTIFICATION DIVISION")
    if not bounds:
        return
    tracker.cover_division(program, "IDENTIFICATION DIVISION")


def _cover_environment(program: CblProgram, tracker: CoverageTracker) -> None:
    bounds = program.divisions.get("ENVIRONMENT DIVISION")
    if not bounds:
        return
    tracker.cover_division(program, "ENVIRONMENT DIVISION")


def _cover_data_division(program: CblProgram, tracker: CoverageTracker) -> None:
    bounds = program.divisions.get("DATA DIVISION")
    if not bounds:
        return

    start, end = bounds
    current_group: list[int] = []

    for line in program.lines:
        if line.number < start or line.number > end:
            continue
        if not line.coverable:
            continue

        current_group.append(line.number)
        if _is_data_group_boundary(line.content):
            tracker.cover_program_lines(program, current_group)
            current_group = []

    if current_group:
        tracker.cover_program_lines(program, current_group)


def _cover_procedure_division(program: CblProgram, tracker: CoverageTracker) -> None:
    bounds = program.divisions.get("PROCEDURE DIVISION")
    if bounds:
        start, end = bounds
        tracker.cover_program_lines(program, list(range(start, end + 1)))

    for paragraph in program.paragraphs:
        tracker.cover_program_lines(program, paragraph.line_numbers)


def _is_data_group_boundary(content: str) -> bool:
    stripped = content.strip()
    if re.match(r"^0[1-9]\s+", stripped):
        return True
    if re.match(r"^FD\b", stripped, re.IGNORECASE):
        return True
    if re.match(r"^COPY\b", stripped, re.IGNORECASE):
        return True
    if stripped.endswith(".") and not stripped.startswith(" "):
        return True
    return False
