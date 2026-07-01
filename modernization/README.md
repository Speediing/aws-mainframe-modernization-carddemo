# CardDemo Modernization

Java ports of CardDemo COBOL batch programs for mainframe modernization pilots.

## Contents

| Path | Description |
|---|---|
| [`business-rules.md`](business-rules.md) | Reverse-engineered business rules from COBOL source |
| [`carddemo-java/`](carddemo-java/) | Java 21 Maven project |

## Pilot: CBTRN02C — Daily Transaction Posting

COBOL source: `app/cbl/CBTRN02C.cbl`

```bash
cd carddemo-java
mvn test
```

Golden regression fixtures live under `carddemo-java/src/test/resources/golden/`.

## Conventions

- COBOL source under `app/` is read-only reference material.
- Business rules are documented in `business-rules.md` before porting.
- Each pilot includes golden-file tests that lock behavioral equivalence.
