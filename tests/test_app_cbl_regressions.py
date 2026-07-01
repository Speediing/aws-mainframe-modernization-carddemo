"""Regression characterization for duplicate paragraph labels and validation logic."""

from tests.cbl.characterizer import characterize_program
from tests.cbl.source import CBL_DIR
from tests.cbl.source_read_coverage import SourceReadCoverageTracker

CBTRN02C_VALIDATION_REASONS = {
    100: "INVALID CARD NUMBER FOUND",
    101: "ACCOUNT RECORD NOT FOUND",
    102: "OVERLIMIT TRANSACTION",
    103: "TRANSACTION RECEIVED AFTER ACCT EXPIRATION",
}


def test_coactvwc_has_duplicate_main_exit_paragraph() -> None:
    tracker = SourceReadCoverageTracker()
    path = CBL_DIR / "COACTVWC.cbl"
    characterization = characterize_program(path, tracker)
    assert characterization.paragraph_names.count("0000-MAIN-EXIT") == 2


def test_cbtrn02c_pins_validation_reason_codes_and_overlimit_comparison() -> None:
    source = (CBL_DIR / "CBTRN02C.cbl").read_text(encoding="utf-8", errors="replace")

    for reason_code, reason_text in CBTRN02C_VALIDATION_REASONS.items():
        assert f"MOVE {reason_code} TO WS-VALIDATION-FAIL-REASON" in source
        assert reason_text in source

    assert "IF ACCT-CREDIT-LIMIT >= WS-TEMP-BAL" in source
