"""Source read coverage tracking for COBOL characterization reach tests."""

from __future__ import annotations

from dataclasses import dataclass, field

from tests.cbl.source import CBL_DIRS, CblProgram, discover_cbl_programs, load_program


@dataclass
class SourceReadCoverageTracker:
    """Tracks which coverable source lines characterization tests have read."""

    covered: dict[str, set[int]] = field(default_factory=dict)
    programs: dict[str, CblProgram] = field(default_factory=dict)

    def __post_init__(self) -> None:
        for path in discover_cbl_programs(CBL_DIRS):
            program = load_program(path)
            self.programs[program.path.name] = program
            self.covered.setdefault(program.path.name, set())

    def cover(self, program_name: str, line_number: int) -> None:
        self.covered.setdefault(program_name, set()).add(line_number)

    def cover_many(self, program_name: str, line_numbers: list[int]) -> None:
        bucket = self.covered.setdefault(program_name, set())
        bucket.update(line_numbers)

    def cover_range(self, program_name: str, start: int, end: int) -> None:
        self.cover_many(program_name, list(range(start, end + 1)))

    def cover_program_lines(self, program: CblProgram, line_numbers: list[int]) -> None:
        coverable = set(program.coverable_line_numbers)
        covered_lines = [line for line in line_numbers if line in coverable]
        self.cover_many(program.name, covered_lines)

    def cover_division(self, program: CblProgram, division_name: str) -> None:
        bounds = program.divisions.get(division_name)
        if not bounds:
            return
        start, end = bounds
        self.cover_program_lines(program, list(range(start, end + 1)))

    def summary(self) -> dict[str, object]:
        total_coverable = 0
        total_covered = 0
        per_file: dict[str, dict[str, float | int]] = {}

        for name, program in sorted(self.programs.items()):
            coverable_count = len(program.coverable_line_numbers)
            covered_count = len(
                self.covered.get(name, set()).intersection(program.coverable_line_numbers)
            )
            total_coverable += coverable_count
            total_covered += covered_count
            characterization_reach = (
                covered_count / coverable_count if coverable_count else 1.0
            )
            per_file[name] = {
                "coverable": coverable_count,
                "covered": covered_count,
                "characterization_reach": characterization_reach,
            }

        overall_characterization_reach = (
            total_covered / total_coverable if total_coverable else 1.0
        )
        return {
            "total_coverable": total_coverable,
            "total_covered": total_covered,
            "overall_characterization_reach": overall_characterization_reach,
            "per_file": per_file,
        }

    def uncovered_lines(self, program_name: str) -> list[int]:
        program = self.programs[program_name]
        covered = self.covered.get(program_name, set())
        return [
            line
            for line in program.coverable_line_numbers
            if line not in covered
        ]
