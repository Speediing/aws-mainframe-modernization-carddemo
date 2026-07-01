# CardDemo Modernization Risk Report

Generated: 2026-07-01T02:43:09.751Z

## Overall Assessment

| Metric | Value |
| --- | --- |
| **Risk score** | **23/100** |
| **Severity** | **Low** |
| Application root | `app/` |

## Manifest Rules

Inventory and topology signals from CSD definitions, source discovery, and module layout.

| Artifact | Count |
| --- | ---: |
| COBOL programs | 44 |
| Copybooks | 62 |
| JCL jobs | 46 |
| CSD programs | 26 |
| CSD transactions | 25 |
| CSD files | 8 |

### Module Distribution

| Module | Programs |
| --- | ---: |
| Base | 31 |
| DB2 (transaction types) | 3 |
| IMS-DB2-MQ (authorizations) | 8 |
| MQ (account extraction) | 2 |

## Coupling Rules

Copybook, subroutine, and middleware dependency density across programs.

| Metric | Value |
| --- | ---: |
| Average COPY count per program | 6.9 |
| Maximum COPY count | 54 |
| Average CALL count per program | 1.5 |

### Most Shared Copybooks

| Copybook | Programs Using |
| --- | ---: |
| DFHBMSCA | 19 |
| DFHAID | 19 |
| COTTL01Y | 19 |
| CSDAT01Y | 19 |
| CSMSG01Y | 19 |
| COCOM01Y | 19 |
| CVACT01Y | 14 |
| CVACT03Y | 14 |
| CSUSR01Y | 12 |
| CVTRA05Y | 11 |

## Test Rules

Screen validation complexity from CSSETATY macro expansion and flag checks.

| Metric | Value |
| --- | ---: |
| Programs with CSSETATY rules | 2 |
| Total CSSETATY rule expansions | 40 |
| Total validation flag checks | 412 |

## Blockers

### ALTER-GOTO-CONTROL-FLOW (Critical)

Programs use ALTER statements that rewrite control flow at runtime; automated refactoring tools cannot safely transform these without manual redesign.

Affected programs: CBSTM03A

### CONTROL-BLOCK-ADDRESSING (Critical)

Programs address mainframe control blocks directly (SET ADDRESS OF); these patterns are platform-specific and block straightforward rehosting.

Affected programs: CBSTM03A

### EXTENSIVE-VALIDATION-RULES (High)

Programs expand CSSETATY copybook validation macros extensively; parity testing is required before any screen/API rewrite.

Affected programs: COACTUPC

## Pilot Candidates

Programs recommended for an initial modernization pilot due to lower scores and fewer blockers.

| Program | Module | Score | Rationale |
| --- | --- | ---: | --- |
| CBACT01C | base | 0 | Batch-only program with VSAM/file I/O and no middleware dependencies. |
| CBACT02C | base | 0 | Batch-only program with VSAM/file I/O and no middleware dependencies. |
| CBACT03C | base | 0 | Batch-only program with VSAM/file I/O and no middleware dependencies. |
| CBACT04C | base | 0 | Batch-only program with VSAM/file I/O and no middleware dependencies. |
| CBCUS01C | base | 0 | Batch-only program with VSAM/file I/O and no middleware dependencies. |
| CBEXPORT | base | 0 | Batch-only program with VSAM/file I/O and no middleware dependencies. |
| CBIMPORT | base | 0 | Batch-only program with VSAM/file I/O and no middleware dependencies. |
| CBTRN01C | base | 0 | Batch-only program with VSAM/file I/O and no middleware dependencies. |

## Top Risk Programs

| Program | Module | Score | Severity | Key Factors |
| --- | --- | ---: | --- | --- |
| COACTUPC | base | 61 | High | large-program, high-copybook-coupling, extensive-screen-validation, many-validation-flags |
| CBSTM03A | base | 55 | High | high-call-coupling, alter-statements, control-block-addressing, heavy-go-to |
| COTRTLIC | db2 | 53 | High | optional-module:db2, large-program, db2-sql, complex-data-layout |
| COPAUA0C | ims-db2-mq | 42 | Medium | optional-module:ims-db2-mq, medium-program, moderate-copybook-coupling, moderate-call-coupling |
| COTRTUPC | db2 | 40 | Medium | optional-module:db2, medium-program, db2-sql, heavy-go-to |
| COPAUS0C | ims-db2-mq | 38 | Medium | optional-module:ims-db2-mq, medium-program, moderate-copybook-coupling, ims-dli |
| COPAUS1C | ims-db2-mq | 30 | Medium | optional-module:ims-db2-mq, moderate-copybook-coupling, ims-dli |
| COCRDUPC | base | 30 | Medium | medium-program, moderate-copybook-coupling, many-validation-flags, heavy-go-to |
| CBPAUP0C | ims-db2-mq | 24 | Low | optional-module:ims-db2-mq, ims-dli |
| COCRDLIC | base | 24 | Low | medium-program, moderate-copybook-coupling, heavy-go-to |

## Program Detail

| Program | Lines | COPY | CALL | CICS | SQL | DLI | CSSETATY | Score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| COACTUPC | 4237 | 54 | 0 | 17 | 0 | 0 | 39 | 61 |
| CBSTM03A | 925 | 4 | 14 | 0 | 0 | 0 | 0 | 55 |
| COTRTLIC | 2099 | 0 | 0 | 12 | 16 | 0 | 0 | 53 |
| COPAUA0C | 1027 | 16 | 4 | 12 | 0 | 8 | 0 | 42 |
| COTRTUPC | 1703 | 0 | 0 | 12 | 7 | 0 | 1 | 40 |
| COPAUS0C | 1033 | 14 | 0 | 10 | 0 | 6 | 0 | 38 |
| COPAUS1C | 605 | 10 | 0 | 8 | 0 | 7 | 0 | 30 |
| COCRDUPC | 1561 | 12 | 0 | 12 | 0 | 0 | 0 | 30 |
| CBPAUP0C | 387 | 2 | 0 | 0 | 0 | 5 | 0 | 24 |
| COCRDLIC | 1460 | 10 | 0 | 18 | 0 | 0 | 0 | 24 |
| COPAUS2C | 245 | 1 | 0 | 3 | 4 | 0 | 0 | 22 |
| COBTUPDT | 238 | 0 | 0 | 0 | 5 | 0 | 0 | 22 |
| DBUNLDGS | 367 | 6 | 6 | 0 | 0 | 0 | 0 | 16 |
| PAUDBLOD | 370 | 4 | 5 | 0 | 0 | 0 | 0 | 16 |
| PAUDBUNL | 318 | 4 | 4 | 0 | 0 | 0 | 0 | 16 |
| COACCT01 | 621 | 1 | 9 | 4 | 0 | 0 | 0 | 16 |
| CODATE01 | 525 | 0 | 9 | 5 | 0 | 0 | 0 | 16 |
| COACTVWC | 942 | 14 | 0 | 15 | 0 | 0 | 0 | 11 |
| COCRDSLC | 888 | 12 | 0 | 14 | 0 | 0 | 0 | 11 |
| COBIL00C | 573 | 10 | 0 | 13 | 0 | 0 | 0 | 6 |
| COTRN02C | 784 | 10 | 2 | 11 | 0 | 0 | 0 | 6 |
| CBSTM03B | 231 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| CBACT01C | 431 | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| CBACT02C | 179 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| CBACT03C | 179 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| CBACT04C | 653 | 5 | 1 | 0 | 0 | 0 | 0 | 0 |
| CBCUS01C | 179 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| CBEXPORT | 583 | 6 | 1 | 0 | 0 | 0 | 0 | 0 |
| CBIMPORT | 488 | 6 | 1 | 0 | 0 | 0 | 0 | 0 |
| CBTRN01C | 495 | 6 | 1 | 0 | 0 | 0 | 0 | 0 |
| CBTRN02C | 732 | 5 | 1 | 0 | 0 | 0 | 0 | 0 |
| CBTRN03C | 650 | 5 | 1 | 0 | 0 | 0 | 0 | 0 |
| COADM01C | 289 | 9 | 0 | 7 | 0 | 0 | 0 | 0 |
| COBSWAIT | 42 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| COMEN01C | 309 | 9 | 0 | 7 | 0 | 0 | 0 | 0 |
| CORPT00C | 650 | 8 | 2 | 7 | 0 | 0 | 0 | 0 |
| COSGN00C | 261 | 8 | 0 | 10 | 0 | 0 | 0 | 0 |
| COTRN00C | 700 | 8 | 0 | 10 | 0 | 0 | 0 | 0 |
| COTRN01C | 331 | 8 | 0 | 5 | 0 | 0 | 0 | 0 |
| COUSR00C | 696 | 8 | 0 | 11 | 0 | 0 | 0 | 0 |
| COUSR01C | 300 | 8 | 0 | 5 | 0 | 0 | 0 | 0 |
| COUSR02C | 415 | 8 | 0 | 6 | 0 | 0 | 0 | 0 |
| COUSR03C | 360 | 8 | 0 | 6 | 0 | 0 | 0 | 0 |
| CSUTLDTC | 158 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

---

_Report generated by `scripts/score-risk.ts`. Re-run with `npm run score-risk`._