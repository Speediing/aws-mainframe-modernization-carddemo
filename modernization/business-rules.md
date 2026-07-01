# CardDemo Business Rules

Reverse-engineered from COBOL source in `app/cbl/` and copybooks in `app/cpy/`.
This document captures behavioral rules for modernization pilots; COBOL source remains authoritative.

## Pilot: Daily Transaction Posting (`CBTRN02C`)

| Attribute | Value |
|---|---|
| COBOL program | `app/cbl/CBTRN02C.cbl` |
| Function | Batch posting of daily transaction file records |
| Java port | `modernization/carddemo-java/` |
| Record layouts | `CVTRA06Y`, `CVACT01Y`, `CVACT03Y`, `CVTRA01Y`, `CVTRA05Y` |

### Inputs

| File | DD name | Organization | Access | Key |
|---|---|---|---|---|
| Daily transactions | `DALYTRAN` | Sequential | Input | — |
| Card cross-reference | `XREFFILE` | Indexed (VSAM KSDS) | Input | `XREF-CARD-NUM` |
| Account master | `ACCTFILE` | Indexed (VSAM KSDS) | I-O | `ACCT-ID` |
| Transaction category balance | `TCATBALF` | Indexed (VSAM KSDS) | I-O | `TRAN-CAT-KEY` (acct + type + category) |
| Posted transactions | `TRANFILE` | Indexed (VSAM KSDS) | Output | `TRAN-ID` |
| Daily rejects | `DALYREJS` | Sequential | Output | — |

### Processing flow

For each daily transaction record:

1. Reset validation trailer (`WS-VALIDATION-FAIL-REASON = 0`).
2. Run validation (`1500-VALIDATE-TRAN`).
3. If validation passes (`reason = 0`), post the transaction (`2000-POST-TRANSACTION`).
4. Otherwise increment reject count and write a reject record (`2500-WRITE-REJECT-REC`).

Program return code is **4** when one or more transactions are rejected; **0** otherwise.

### Validation rules (`1500-VALIDATE-TRAN`)

Validation is sequential; the first failing rule wins.

#### Rule 100 — Invalid card number (`1500-A-LOOKUP-XREF`)

- Lookup `DALYTRAN-CARD-NUM` in the card cross-reference file keyed by `XREF-CARD-NUM`.
- **Reject 100** with description `INVALID CARD NUMBER FOUND` when the card is not found.

#### Rule 101 — Account not found (`1500-B-LOOKUP-ACCT`)

- Resolve `XREF-ACCT-ID` and read the account master keyed by `ACCT-ID`.
- **Reject 101** with description `ACCOUNT RECORD NOT FOUND` when the account is not found.

#### Rule 102 — Overlimit transaction

Evaluated only after a successful account read:

```
WS-TEMP-BAL = ACCT-CURR-CYC-CREDIT - ACCT-CURR-CYC-DEBIT + DALYTRAN-AMT
```

- **Reject 102** with description `OVERLIMIT TRANSACTION` when `ACCT-CREDIT-LIMIT < WS-TEMP-BAL`.

#### Rule 103 — Transaction after account expiration

Evaluated only after a successful account read (and only if rule 102 did not fire):

- Compare `ACCT-EXPIRAION-DATE` (copybook spelling) to the date portion of `DALYTRAN-ORIG-TS` (first 10 characters, `YYYY-MM-DD`).
- **Reject 103** with description `TRANSACTION RECEIVED AFTER ACCT EXPIRATION` when the account expiration date is **strictly less than** the transaction date.

> **Note:** Rule 103 is evaluated even when rule 102 would have applied; COBOL overwrites the validation code if both conditions are true. The Java port preserves this evaluation order.

### Posting rules (`2000-POST-TRANSACTION`)

When validation succeeds:

1. **Build posted transaction** — copy daily transaction fields into `TRAN-RECORD` (`CVTRA05Y`).
2. **Set processing timestamp** — `TRAN-PROC-TS` is populated from `FUNCTION CURRENT-DATE` formatted as DB2 timestamp: `YYYY-MM-DD-HH.MM.SS.MMMMMM` (see `Z-GET-DB2-FORMAT-TIMESTAMP`).
3. **Update transaction category balance** (`2700-UPDATE-TCATBAL`):
   - Key = `(XREF-ACCT-ID, DALYTRAN-TYPE-CD, DALYTRAN-CAT-CD)`.
   - If no record exists (INVALID KEY / status `23`), create a new record with balance = transaction amount.
   - Otherwise add `DALYTRAN-AMT` to `TRAN-CAT-BAL` and rewrite.
4. **Update account balances** (`2800-UPDATE-ACCOUNT-REC`):
   - `ACCT-CURR-BAL += DALYTRAN-AMT`
   - If `DALYTRAN-AMT >= 0`: `ACCT-CURR-CYC-CREDIT += DALYTRAN-AMT`
   - Else: `ACCT-CURR-CYC-DEBIT += DALYTRAN-AMT`
   - Rewrite account record; INVALID KEY sets **reject 109** (`ACCOUNT RECORD NOT FOUND`).
5. **Write posted transaction** to `TRANFILE` (`2900-WRITE-TRANSACTION-FILE`).

### Reject record format

Each reject record is **430 bytes**:

| Field | Size | Source |
|---|---|---|
| Transaction data | 350 | Full `DALYTRAN-RECORD` |
| Validation reason code | 4 | `WS-VALIDATION-FAIL-REASON` (numeric) |
| Validation reason description | 76 | `WS-VALIDATION-FAIL-REASON-DESC` |

### Data encoding

- Monetary fields use COBOL **zoned decimal** (`S9(n)V99`) with IBM overpunch sign in the last character.
- Positive overpunch: `{`=+0, `A`–`I`=+1..+9.
- Negative overpunch: `}`=−0, `J`–`R`=−1..−9.

### Validation reason code summary

| Code | Description |
|---|---|
| 100 | Invalid card number |
| 101 | Account record not found |
| 102 | Overlimit transaction |
| 103 | Transaction received after account expiration |
| 109 | Account rewrite failed (posting phase) |

## Future pilots (not yet ported)

| Program | Function | Priority |
|---|---|---|
| `COPAUA0C` | Real-time authorization decision engine | High |
| `CSUTLDTC` | Date validation utility | Medium |
| `CBACT04C` | Interest calculation | Medium |
| `CBSTM03A` | Statement generation (transpiler stress test) | Low |
