"""COBOL source parsing helpers for characterization tests."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

CBL_DIR = Path(__file__).resolve().parents[2] / "app" / "cbl"

DIVISION_NAMES = (
    "IDENTIFICATION DIVISION",
    "ENVIRONMENT DIVISION",
    "DATA DIVISION",
    "PROCEDURE DIVISION",
)

RESERVED_PARAGRAPH_NAMES = {
    "DIVISION",
    "SECTION",
    "DATA",
    "PROCEDURE",
    "ENVIRONMENT",
    "IDENTIFICATION",
    "WORKING-STORAGE",
    "LINKAGE",
    "FILE",
    "INPUT-OUTPUT",
    "CONFIGURATION",
    "FILE-CONTROL",
    "LOCAL-STORAGE",
    "EXIT",
    "ELSE",
    "WHEN",
    "OTHER",
}

SCOPE_TERMINATOR_PREFIXES = ("END-",)


@dataclass
class SourceLine:
    number: int
    text: str
    content: str
    coverable: bool


@dataclass
class Paragraph:
    name: str
    start_line: int
    end_line: int
    line_numbers: list[int] = field(default_factory=list)


@dataclass
class CblProgram:
    path: Path
    lines: list[SourceLine]
    divisions: dict[str, tuple[int, int]]
    program_id: str
    author: str | None
    copybooks: list[tuple[int, str]]
    file_selects: list[tuple[int, str]]
    call_targets: list[tuple[int, str]]
    cics_commands: list[tuple[int, str]]
    paragraphs: list[Paragraph]
    data_items: list[tuple[int, str]]
    coverable_line_numbers: list[int]

    @property
    def name(self) -> str:
        return self.path.name


def discover_cbl_programs(cbl_dir: Path = CBL_DIR) -> list[Path]:
    return sorted(path for path in cbl_dir.iterdir() if path.is_file())


def cobol_content(line: str) -> str:
    if len(line) > 6:
        content = line[6:]
    else:
        content = line
    return strip_sequence_number(content)


def strip_sequence_number(content: str) -> str:
    """Remove fixed-format sequence numbers commonly found in columns 73-80."""
    match = re.match(r"^(.*?)(\s+\d{1,8})\s*$", content.rstrip())
    if not match:
        return content.rstrip()
    body = match.group(1).rstrip()
    if not body:
        return content.rstrip()
    return body


def is_coverable_line(line: str) -> bool:
    content = cobol_content(line)
    stripped = content.strip()
    if not stripped:
        return False
    if stripped.startswith("*"):
        return False
    return True


def load_program(path: Path) -> CblProgram:
    raw_lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    source_lines: list[SourceLine] = []
    for number, text in enumerate(raw_lines, start=1):
        content = cobol_content(text)
        source_lines.append(
            SourceLine(
                number=number,
                text=text,
                content=content,
                coverable=is_coverable_line(text),
            )
        )

    joined = "\n".join(raw_lines)
    program_id = _extract_program_id(joined)
    author = _extract_author(joined)
    divisions = _extract_divisions(source_lines)
    copybooks = _extract_copybooks(source_lines)
    file_selects = _extract_file_selects(source_lines)
    call_targets = _extract_call_targets(source_lines)
    cics_commands = _extract_cics_commands(source_lines)
    paragraphs = _extract_paragraphs(source_lines, divisions.get("PROCEDURE DIVISION"))
    data_items = _extract_data_items(source_lines, divisions.get("DATA DIVISION"))
    coverable_line_numbers = [line.number for line in source_lines if line.coverable]

    return CblProgram(
        path=path,
        lines=source_lines,
        divisions=divisions,
        program_id=program_id,
        author=author,
        copybooks=copybooks,
        file_selects=file_selects,
        call_targets=call_targets,
        cics_commands=cics_commands,
        paragraphs=paragraphs,
        data_items=data_items,
        coverable_line_numbers=coverable_line_numbers,
    )


def _extract_program_id(text: str) -> str:
    match = re.search(r"PROGRAM-ID\.\s+([A-Z0-9-]+)", text, re.IGNORECASE)
    if not match:
        raise ValueError("PROGRAM-ID not found")
    return match.group(1).upper()


def _extract_author(text: str) -> str | None:
    match = re.search(r"AUTHOR\.\s+(.+?)\.", text, re.IGNORECASE)
    if not match:
        return None
    return match.group(1).strip()


def _extract_divisions(source_lines: list[SourceLine]) -> dict[str, tuple[int, int]]:
    division_starts: list[tuple[str, int]] = []
    for line in source_lines:
        normalized = re.sub(r"\s+", " ", strip_sequence_number(line.content).strip().upper())
        for division in DIVISION_NAMES:
            if re.match(rf"^{re.escape(division)}(\.|\s)", normalized):
                division_starts.append((division, line.number))
                break

    divisions: dict[str, tuple[int, int]] = {}
    for index, (name, start) in enumerate(division_starts):
        end = (
            division_starts[index + 1][1] - 1
            if index + 1 < len(division_starts)
            else source_lines[-1].number
        )
        divisions[name] = (start, end)
    return divisions


def _extract_copybooks(source_lines: list[SourceLine]) -> list[tuple[int, str]]:
    copybooks: list[tuple[int, str]] = []
    for line in source_lines:
        match = re.search(r"\bCOPY\s+([A-Z0-9-]+)", line.content, re.IGNORECASE)
        if match:
            copybooks.append((line.number, match.group(1).upper()))
    return copybooks


def _extract_file_selects(source_lines: list[SourceLine]) -> list[tuple[int, str]]:
    selects: list[tuple[int, str]] = []
    for line in source_lines:
        match = re.search(r"\bSELECT\s+([A-Z0-9-]+)", line.content, re.IGNORECASE)
        if match:
            selects.append((line.number, match.group(1).upper()))
    return selects


def _extract_call_targets(source_lines: list[SourceLine]) -> list[tuple[int, str]]:
    calls: list[tuple[int, str]] = []
    for line in source_lines:
        match = re.search(r"\bCALL\s+'?\"?([A-Z0-9-]+)'?\"?", line.content, re.IGNORECASE)
        if match:
            calls.append((line.number, match.group(1).upper()))
    return calls


def _extract_cics_commands(source_lines: list[SourceLine]) -> list[tuple[int, str]]:
    commands: list[tuple[int, str]] = []
    for line in source_lines:
        match = re.search(r"\bEXEC\s+CICS\s+([A-Z]+)", line.content, re.IGNORECASE)
        if match:
            commands.append((line.number, match.group(1).upper()))
    return commands


def _extract_data_items(
    source_lines: list[SourceLine],
    data_division: tuple[int, int] | None,
) -> list[tuple[int, str]]:
    if not data_division:
        return []

    start, end = data_division
    items: list[tuple[int, str]] = []
    for line in source_lines:
        if line.number < start or line.number > end or not line.coverable:
            continue
        match = re.match(
            r"^\s*(0[1-9]|[1-9][0-9])\s+([A-Z0-9-]+)",
            line.content,
            re.IGNORECASE,
        )
        if match:
            items.append((line.number, match.group(2).upper()))
    return items


def _extract_paragraphs(
    source_lines: list[SourceLine],
    procedure_division: tuple[int, int] | None,
) -> list[Paragraph]:
    if not procedure_division:
        return []

    start, end = procedure_division
    paragraphs: list[Paragraph] = []
    current: Paragraph | None = None

    for line in source_lines:
        if line.number < start or line.number > end:
            continue
        match = re.match(r"^(\s*)([A-Z0-9][A-Z0-9-]*)\.\s*$", line.content)
        if match and len(match.group(1)) <= 11:
            name = match.group(2).upper()
            if name in RESERVED_PARAGRAPH_NAMES or name.endswith("-DIVISION"):
                continue
            if any(name.startswith(prefix) for prefix in SCOPE_TERMINATOR_PREFIXES):
                continue
            if current is not None:
                current.end_line = line.number - 1
                paragraphs.append(current)
            current = Paragraph(name=name, start_line=line.number, end_line=end)
            current.line_numbers.append(line.number)
            continue
        if current is not None and line.coverable:
            current.line_numbers.append(line.number)

    if current is not None:
        current.end_line = end
        paragraphs.append(current)

    if not paragraphs:
        line_numbers = [
            line.number
            for line in source_lines
            if start <= line.number <= end and line.coverable
        ]
        if line_numbers:
            paragraphs.append(
                Paragraph(
                    name="PROCEDURE-DIVISION-BODY",
                    start_line=line_numbers[0],
                    end_line=line_numbers[-1],
                    line_numbers=line_numbers,
                )
            )
    else:
        for paragraph in paragraphs:
            if paragraph.end_line >= paragraph.start_line:
                paragraph.line_numbers = [
                    line.number
                    for line in source_lines
                    if paragraph.start_line <= line.number <= paragraph.end_line
                    and line.coverable
                ]

    return paragraphs


def line_range(start: int, end: int) -> range:
    return range(start, end + 1)
