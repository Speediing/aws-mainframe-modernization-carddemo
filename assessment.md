# CardDemo Codebase Assessment

Automated inventory of the [CardDemo](https://github.com/aws-samples/aws-mainframe-modernization-carddemo) mainframe credit-card management demo application. This repository is intentionally heterogeneous to exercise migration and modernization tooling.

**Scan date:** 2026-07-01  
**Repository root:** `/workspace`  
**Total tracked files:** 359 (240 under `app/`)

---

## Executive Summary

CardDemo is a **z/OS mainframe application** written primarily in **COBOL**, with **CICS** online transactions, **VSAM** persistence, and **JCL** batch orchestration. Three optional extensions add **DB2**, **IMS DB**, and **IBM MQ** integration patterns. The codebase is well-structured by artifact type (`cbl/`, `cpy/`, `bms/`, `jcl/`, `csd/`) but exhibits **high coupling through shared copybooks** and **monolithic online programs** in the account/card domain.

Recommended migration sequencing: **data copybooks → batch utilities → MQ inquiry extension → core online → multi-stack extensions**.

---

## Languages

| Language / Artifact | Location | Count | Role |
|---|---|---:|---|
| COBOL (`.cbl`, `.CBL`) | `app/cbl/`, `app/app-*/cbl/` | 44 | Online CICS and batch business logic |
| COBOL copybooks (`.cpy`, `.CPY`) | `app/cpy/`, `app/cpy-bms/`, `app/app-*/cpy/` | 62 | Record layouts, commareas, BMS maps |
| BMS maps (`.bms`) | `app/bms/`, `app/app-*/bms/` | 23 | 3270 terminal screen definitions |
| JCL (`.jcl`, `.JCL`) | `app/jcl/`, `app/app-*/jcl/`, `samples/jcl/` | 55 | Batch jobs, dataset setup, utilities |
| Assembler (`.asm`) | `app/asm/` | 2 | Timer and date-format utilities |
| Assembler macros (`.mac`) | `app/maclib/` | 2 | Macro library for assembler programs |
| CICS CSD (`.csd`) | `app/csd/`, `app/app-*/csd/` | 4 | CICS resource definitions (files, programs, transactions) |
| DB2 DDL/DCL (`.ddl`, `.dcl`) | `app/app-*/ddl/`, `app/app-*/dcl/` | 9 | Relational schema for DB2 extensions |
| IMS DBD/PSB (`.dbd`, `.psb`, `.PSB`) | `app/app-authorization-ims-db2-mq/ims/` | 8 | Hierarchical database definitions |
| Procedures (`.prc`) | `app/proc/`, `samples/proc/` | 6 | JCL procedure libraries |
| Control cards (`.ctl`) | `app/ctl/`, `app/app-*/ctl/` | 8 | DB2 utility control files |
| Scheduler exports | `app/scheduler/` | 2 | CA-7 and Control-M job definitions |
| Shell scripts (`.sh`) | `scripts/` | 9 | Local compile helpers, version stamping |
| Documentation (`.md`) | repo root, `app/app-*/` | 6 | README and extension guides |
| Diagrams (`.png`, `.drawio`) | `diagrams/` | 12 | Architecture and flow documentation |

No Java, Python application code, Node.js, or modern web frameworks are present. All runtime logic is mainframe-native.

---

## Frameworks and Platform Dependencies

### Core stack (base application)

| Framework / Runtime | Evidence | Usage |
|---|---|---|
| **IBM CICS** | `EXEC CICS` in 25 programs; `app/csd/CARDDEMO.CSD` | Online transactions, BMS maps, VSAM file control |
| **VSAM (KSDS/AIX)** | CSD `DEFINE FILE` entries; copybooks `CVACT*Y`, `CVTRA*Y`, `CVCUS01Y` | Account, card, customer, transaction, security data |
| **BMS / 3270** | `app/bms/*.bms`, `app/cpy-bms/*.CPY`, `COPY DFHAID` / `DFHBMSCA` | Terminal UI for 17 base screens |
| **JCL / z/OS utilities** | `app/jcl/*.jcl` — IDCAMS, SORT, IEBGENER, IEFBR14, SDSF | Dataset creation, batch pipeline, file maintenance |
| **Language Environment (LE)** | `CALL 'CEE3ABD'`, `CALL "CEEDAYS"` in `CSUTLDTC.cbl` | Abnormal termination, date arithmetic |
| **RACF** | `samples/jcl/RACFCMDS.jcl`; README security section | User authentication (USRSEC VSAM file) |
| **Assembler subprograms** | `app/asm/MVSWAIT.asm`, `app/asm/COBDATFT.asm` | Batch wait timer; EBCDIC date conversion |

### Optional extensions

| Extension | Path | Technologies | Programs |
|---|---|---|---|
| Authorization (IMS/DB2/MQ) | `app/app-authorization-ims-db2-mq/` | IMS DL/I (`CBLTDLI`), DB2 (`EXEC SQL`), IBM MQ (`MQOPEN`/`MQGET`/`MQPUT`) | 8 |
| Transaction type (DB2) | `app/app-transaction-type-db2/` | DB2 embedded SQL, cursors, CICS-DB2 precompile | 3 |
| Account inquiry (VSAM/MQ) | `app/app-vsam-mq/` | VSAM read + IBM MQ request/response | 2 |

### Build and deployment artifacts

| Artifact | Path | Purpose |
|---|---|---|
| Compile samples | `samples/jcl/BATCMP.jcl`, `BMSCMP.jcl`, `CICCMP.jcl`, `CICDBCMP.jcl`, `IMSMQCMP.jcl` | Reference compile JCL for batch, BMS, CICS, CICS+DB2, CICS+IMS+MQ |
| Build procs | `samples/proc/BUILDBAT.prc`, `BUILDBMS.prc`, `BUILDONL.prc`, `BLDCIDB2.prc` | Parameterized compile procedures |
| Local compile | `scripts/local_compile.sh`, `scripts/compile_batch.jcl.template` | Off-mainframe compile workflow |
| Scheduler | `app/scheduler/CardDemo.ca7`, `app/scheduler/CardDemo.controlm` | Production job scheduling definitions |

---

## Application Topology

```
                    ┌─────────────────────────────────────────┐
                    │           CICS Online (CC00 entry)       │
                    │  COSGN00C → COMEN01C / COADM01C menus   │
                    └──────────────┬──────────────────────────┘
                                   │ EXEC CICS READ/WRITE
                    ┌──────────────▼──────────────────────────┐
                    │     VSAM Files (CARDDEMO.CSD)            │
                    │  ACCTDAT, CARDDAT, CUSTDAT, CCXREF,      │
                    │  TRANSACT, USRSEC + alternate indexes    │
                    └──────────────┬──────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
  ┌──────▼──────┐          ┌───────▼───────┐         ┌───────▼───────┐
  │ Batch JCL   │          │ ext-vsam-mq   │         │ ext-auth      │
  │ POSTTRAN,   │          │ CODATE01/     │         │ COPAUA0C +    │
  │ INTCALC,    │          │ COACCT01      │         │ IMS + DB2 + MQ│
  │ CREASTMT    │          └───────────────┘         └───────────────┘
  └─────────────┘
```

### CICS transactions (base)

Defined in `app/csd/CARDDEMO.CSD`:

| Trans ID | Program | Function |
|---|---|---|
| CC00 | COSGN00C | Sign-on / entry |
| CM00 | COMEN01C | Main user menu |
| CA00 | COADM01C | Admin menu |
| CAVW | COACTVWC | View account |
| CAUP | COACTUPC | Update account |
| CB00 | COBIL00C | Bill payment |
| CCLI | COCRDLIC | List cards |
| CCDL | COCRDSLC | View card detail |
| CCUP | COCRDUPC | Update card |
| CT00–CT02 | COTRN00C–COTRN02C | Transaction list/add/view |
| CU00–CU03 | COUSR00C–COUSR03C | User admin |
| CR00 | CORPT00C | Reports |
| CDV1 | — | Card detail view alias |

### Batch pipeline (core)

Sequential jobs documented in `README.md` and implemented in `app/jcl/`:

1. **Setup:** `DUSRSECJ`, `ACCTFILE`, `CARDFILE`, `CUSTFILE`, `XREFFILE`, `TRANFILE`, `DISCGRP`, `TCATBALF`, `TRANCATG`, `TRANTYPE`
2. **Processing:** `POSTTRAN` → `CBTRN02C`, `INTCALC` → `CBACT04C`, `COMBTRAN`, `CREASTMT` → `CBSTM03A`/`CBSTM03B`
3. **Reporting:** `TRANREPT` → `CBTRN03C`, `PRTCATBL`
4. **Utilities:** `CBEXPORT`/`CBIMPORT`, `FTPJCL.JCL`, `TXT2PDF1.JCL`, `WAITSTEP` → `COBSWAIT`/`MVSWAIT`

---

## Hotspots

Programs ranked by size and integration complexity. Line counts from source scan.

| Rank | Program | Path | Lines | CICS | SQL | MQ | IMS | Notes |
|---:|---|---|---:|:-:|:-:|:-:|:-:|---|
| 1 | COACTUPC | `app/cbl/COACTUPC.cbl` | 4,237 | ✓ | — | — | — | Largest program; 17 EXEC CICS; 30+ COPY CSSETATY variants; account update with VSAM browse |
| 2 | COTRTLIC | `app/app-transaction-type-db2/cbl/COTRTLIC.cbl` | 2,099 | ✓ | ✓ | — | — | DB2 cursors; transaction type list/delete |
| 3 | COTRTUPC | `app/app-transaction-type-db2/cbl/COTRTUPC.cbl` | 1,703 | ✓ | ✓ | — | — | DB2 insert/update via static SQL |
| 4 | COCRDUPC | `app/cbl/COCRDUPC.cbl` | 1,561 | ✓ | — | — | — | Card update; heavy BMS field validation |
| 5 | COCRDLIC | `app/cbl/COCRDLIC.cbl` | 1,460 | ✓ | — | — | — | Card list with STARTBR/READNEXT browse |
| 6 | COPAUS0C | `app/app-authorization-ims-db2-mq/cbl/COPAUS0C.cbl` | 1,033 | ✓ | — | — | — | Authorization summary screen |
| 7 | COPAUA0C | `app/app-authorization-ims-db2-mq/cbl/COPAUA0C.cbl` | 1,027 | ✓ | — | ✓ | — | MQ-driven authorization processor |
| 8 | COACTVWC | `app/cbl/COACTVWC.cbl` | 942 | ✓ | — | — | — | Account view; 5 VSAM files |
| 9 | CBSTM03A | `app/cbl/CBSTM03A.CBL` | 925 | — | — | — | — | Statement generation driver; 11× CALL CBSTM03B |
| 10 | COCRDSLC | `app/cbl/COCRDSLC.cbl` | 888 | ✓ | — | — | — | Card search/detail |

### Shared copybook hubs (coupling concentration)

These copybooks appear in 10+ programs and any schema change ripples widely:

| Copybook | Path | Inbound refs | Domain |
|---|---|---:|---|
| COCOM01Y | `app/cpy/COCOM01Y.cpy` | 19 | CICS commarea |
| COTTL01Y | `app/cpy/COTTL01Y.cpy` | 19 | Screen titles |
| CSDAT01Y | `app/cpy/CSDAT01Y.cpy` | 19 | Date handling |
| CSMSG01Y | `app/cpy/CSMSG01Y.cpy` | 19 | Message codes |
| DFHAID / DFHBMSCA | CICS supplied | 19 | BMS attribute bytes |
| CVACT01Y | `app/cpy/CVACT01Y.cpy` | 14 | Account record (300 bytes) |
| CVACT03Y | `app/cpy/CVACT03Y.cpy` | 14 | Card-account cross-ref (50 bytes) |
| CVTRA05Y | `app/cpy/CVTRA05Y.cpy` | 11 | Online transaction record (350 bytes) |
| CVCUS01Y | `app/cpy/CVCUS01Y.cpy` | 10 | Customer record (500 bytes) |

---

## Risks

### High

| Risk | Impact | Evidence |
|---|---|---|
| **Monolithic online programs** | Single-program migration blocks entire screen flows | `COACTUPC.cbl` (4,237 lines), `COCRDUPC.cbl`, `COCRDLIC.cbl` combine UI, validation, and data access |
| **Shared copybook coupling** | Data model changes require coordinated recompile of 14–19 programs | `CVACT01Y`, `COCOM01Y` used across online and batch |
| **VSAM-as-system-of-record** | No relational integrity; cross-file consistency enforced in COBOL | Account/card/customer/xref maintained separately; `COACTUPC` reads 5+ files per transaction |
| **Multi-technology extensions** | Authorization module requires IMS + DB2 + MQ + VSAM + CICS in one flow | `app/app-authorization-ims-db2-mq/` — two-phase commit patterns |

### Medium

| Risk | Impact | Evidence |
|---|---|---|
| **Batch ↔ online file sharing** | CICS must CLOSE files before batch (`CLOSEFIL`/`OPENFIL` JCL) | `app/jcl/CLOSEFIL.jcl`, `app/jcl/OPENFIL.jcl` |
| **Hard-coded dataset names** | Environment-specific HLQ (`AWS.M2.CARDDEMO.*`) embedded in CSD and JCL | `app/csd/CARDDEMO.CSD` lines 2, 26, 39, etc. |
| **Assembler dependencies** | Batch date/wait logic requires asm link | `CBACT01C.cbl` CALL `COBDATFT`; `COBSWAIT.cbl` CALL `MVSWAIT` |
| **Dead / placeholder programs in CSD** | CSD references programs not in repo (`COCRDSEC`, `COACTDEC`) | `app/csd/CARDDEMO.CSD` lines 211–218 |
| **Mixed COBOL dialects** | Upper/lowercase extensions; REPLACING COPY in `COACTUPC` | 30 dynamic COPY REPLACING blocks |

### Low

| Risk | Impact | Evidence |
|---|---|---|
| **Unused copybook** | Dead code noise in inventory | `app/cpy/UNUSED1Y.cpy` |
| **Scheduler format lock-in** | CA-7 and Control-M exports may not match target scheduler | `app/scheduler/` |
| **EBCDIC sample data** | Binary data requires careful transfer | Referenced in README; extension data under `app/app-authorization-ims-db2-mq/data/EBCDIC/` |

---

## Recommended Pilot

### Phase 1 — Data layer + isolated MQ extension (lowest risk, highest learning value)

**Scope:**

1. **`app/cpy/` copybooks** — Map VSAM record layouts (`CVACT01Y`, `CVACT02Y`, `CVACT03Y`, `CVCUS01Y`, `CVTRA*Y`, `CSUSR01Y`) to target data model. No runtime dependencies; 30 files.
2. **`app/app-vsam-mq/`** — Two programs (`CODATE01.cbl`, `COACCT01.cbl`), one CSD file (`csd/CRDDEMOM.csd`), transactions CDRD/CDRA. Depends only on base copybooks and IBM MQ APIs.
3. **Simple batch readers** — `CBCUS01C.cbl` (158 lines), `CBACT02C.cbl`, `CBACT03C.cbl` invoked by `READCUST.jcl`, `READCARD.jcl`, `READXREF.jcl`.

**Why this pilot:**

- **2 MQ programs** vs. 44 total COBOL programs — bounded scope
- **No DB2 or IMS** infrastructure required for initial wave
- Exercises **copybook extraction**, **MQ API mapping**, and **VSAM read semantics**
- `ext-vsam-mq` has `pilot_ready: true` in coupling analysis (see `coupling-map.md`)

**Success criteria:**

- All `app/cpy/CV*.cpy` record layouts documented in target schema
- `CODATE01` and `COACCT01` behavior replicated (MQ request/response for date and account inquiry)
- Batch readers produce equivalent output from sample PS files in README

### Phase 2 — Core batch pipeline

**Scope:** `POSTTRAN`/`CBTRN02C`, `INTCALC`/`CBACT04C`, `CREASTMT`/`CBSTM03A`+`CBSTM03B`

**Prerequisite:** Phase 1 copybook migration; `CLOSEFIL`/`OPENFIL` coordination strategy.

### Phase 3 — Core online (largest effort)

**Scope:** Sign-on (`COSGN00C`) → menus → account/card/transaction screens

**Defer:** `COACTUPC` (4,237 lines) until smaller online programs (`COSGN00C`, `COMEN01C`, `COTRN01C`) are migrated and patterns established.

### Phase 4 — Multi-stack extensions

**Scope:** `app/app-transaction-type-db2/` then `app/app-authorization-ims-db2-mq/`

**Prerequisite:** DB2 and IMS target infrastructure; MQ already validated in Phase 1.

---

## Module Inventory Summary

| Module | Path | COBOL | JCL | Key artifacts |
|---|---|---:|---:|---|
| Base online | `app/cbl/CO*.cbl` | 17 | — | 17 BMS maps, 18 CICS transactions |
| Base batch | `app/cbl/CB*.cbl`, `CSUTLDTC.cbl`, `COBSWAIT.cbl` | 14 | 38 | Assembler utils, batch pipeline |
| Base copybooks | `app/cpy/` | — | — | 30 data copybooks |
| Authorization ext | `app/app-authorization-ims-db2-mq/` | 8 | 4 | IMS DBD/PSB, DB2 DDL, MQ |
| Trntype DB2 ext | `app/app-transaction-type-db2/` | 3 | 3 | DB2 DDL/DCL, ctl cards |
| VSAM/MQ ext | `app/app-vsam-mq/` | 2 | — | MQ CSD definitions |
| Build samples | `samples/` | — | 8 | Compile JCL and procs |
| Tooling | `scripts/` | — | — | Local compile, markers |

---

## References

- Application overview: `README.md`
- Authorization extension: `app/app-authorization-ims-db2-mq/README.md`
- Transaction type extension: `app/app-transaction-type-db2/README.md`
- MQ inquiry extension: `app/app-vsam-mq/README.md`
- Module coupling detail: `coupling-map.md`
- Architecture diagrams: `diagrams/`
