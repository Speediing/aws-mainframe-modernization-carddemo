# CardDemo Coupling Map

Dependency analysis derived from `COPY`, `CALL`, CSD resource references, and JCL `PGM=` statements across the repository. Arrows indicate compile-time or runtime coupling direction: **outbound** = what this module depends on; **inbound** = what depends on this module.

**Scan date:** 2026-07-01

---

## Module-Level Coupling

| Module | Path | Inbound deps | Outbound deps | pilot_ready | Notes |
|---|---|---|---|:---:|---|
| base-copybooks | `app/cpy/` | base-online, base-batch, ext-vsam-mq, ext-auth-ims-db2-mq | — | **yes** | 30 data copybooks; highest fan-in in codebase. Migrate first — all programs compile against these layouts. Key files: `CVACT01Y.cpy`, `CVCUS01Y.cpy`, `CVTRA05Y.cpy`, `COCOM01Y.cpy`. |
| base-bms | `app/bms/`, `app/cpy-bms/` | base-online, ext-auth-ims-db2-mq, ext-trntype-db2 | — | **yes** | 17 base + 4 extension BMS maps. Generated into `cpy-bms/*.CPY` at compile time. Screen changes require map + program recompile. |
| base-asm | `app/asm/`, `app/maclib/` | base-batch | — | **yes** | `MVSWAIT.asm` (timer), `COBDATFT.asm` (date format). Called from `COBSWAIT.cbl`, `CBACT01C.cbl`. Small, self-contained; good early utility migration. |
| base-jcl | `app/jcl/` | — | base-batch | **yes** | 38 batch/setup jobs. Orchestrates batch programs via `PGM=` (e.g. `POSTTRAN.jcl` → `CBTRN02C`, `INTCALC.jcl` → `CBACT04C`). No inbound code deps. |
| base-csd | `app/csd/CARDDEMO.CSD` | base-online | — | **yes** | Defines 8 VSAM files, 17 programs, 17 mapsets, 18 transactions for CICS group CARDDEMO. Loaded via `app/jcl/CBADMCDJ.jcl` (DFHCSDUP). |
| base-batch | `app/cbl/CB*.cbl`, `CSUTLDTC.cbl`, `COBSWAIT.cbl` | base-jcl, base-online | base-copybooks, base-asm, system:lang-runtime | **yes** | 14 batch programs. Core pipeline: `CBTRN02C` (posting), `CBACT04C` (interest), `CBSTM03A`/`CBSTM03B` (statements). Calls `CEE3ABD` on fatal errors. |
| base-online | `app/cbl/CO*.cbl` | — | base-copybooks, base-bms, base-csd, base-batch, system:cics-bms | **no** | 17 CICS programs, 20,650 total lines. Depends on shared copybooks (19 programs share `COCOM01Y`). Calls `CSUTLDTC` from `COTRN02C`, `CORPT00C`. Largest: `COACTUPC.cbl` (4,237 lines). |
| ext-vsam-mq | `app/app-vsam-mq/` | — | base-copybooks, system:ibm-mq | **yes** | 2 programs: `CODATE01.cbl` (system date via MQ), `COACCT01.cbl` (account inquiry via MQ). CSD: `csd/CRDDEMOM.csd`. Transactions CDRD, CDRA. Minimal coupling — ideal pilot. |
| ext-trntype-db2 | `app/app-transaction-type-db2/` | — | base-copybooks, base-bms, system:db2 | **no** | 3 programs with embedded SQL: `COTRTLIC.cbl`, `COTRTUPC.cbl`, `COBTUPDT.cbl`. DB2 DDL in `ddl/`, DCL in `dcl/`. Requires DB2 precompiler. CSD: `csd/CRDDEMOD.csd`. |
| ext-auth-ims-db2-mq | `app/app-authorization-ims-db2-mq/` | — | base-copybooks, base-bms, system:ibm-mq, system:ims-dli, system:db2 | **no** | 8 programs. Triple-stack: `COPAUA0C.cbl` (MQ auth), IMS DL/I via `CBLTDLI` in `PAUDBLOD.CBL`/`PAUDBUNL.CBL`, DB2 SQL in `COPAUS2C.cbl`. Highest integration complexity. |
| samples | `samples/jcl/`, `samples/proc/` | — | — | **yes** | Reference compile JCL (`BATCMP.jcl`, `CICDBCMP.jcl`, `IMSMQCMP.jcl`) and build procs. No runtime coupling. |
| scripts | `scripts/` | — | — | **yes** | `local_compile.sh`, compile template, git version script, build markers. Dev tooling only. |

### System / external dependencies (not in repo)

| System dep | Consumed by | API surface |
|---|---|---|
| system:cics-bms | base-online, ext-trntype-db2, ext-auth-ims-db2-mq | `DFHAID`, `DFHBMSCA` copybooks; `EXEC CICS SEND/RECEIVE MAP` |
| system:ibm-mq | ext-vsam-mq, ext-auth-ims-db2-mq | `MQOPEN`, `MQGET`, `MQPUT`, `MQPUT1`, `MQCLOSE`; MQ copybooks `CMQ*` |
| system:ims-dli | ext-auth-ims-db2-mq | `CALL 'CBLTDLI'`; PCB copybooks `PAUTBPCB`, `PADFLPCB`, `PASFLPCB` |
| system:db2 | ext-trntype-db2, ext-auth-ims-db2-mq | `EXEC SQL`; SQLCA; DB2 precompiler |
| system:lang-runtime | base-batch | `CEE3ABD`, `CEEDAYS` (Language Environment) |
| system:zos-util | base-jcl | IDCAMS, SORT, IEBGENER, IEFBR14, IKJEFT01, FTP, SDSF |

---

## Program-Level Coupling (Base Online)

| Program | Path | Inbound | Outbound | pilot_ready | Notes |
|---|---|---|---|:---:|---|
| COSGN00C | `app/cbl/COSGN00C.cbl` | CC00 transaction | COCOM01Y, COSGN00, CSUSR01Y, USRSEC VSAM | **yes** | Entry point (258 lines). Reads security file. Good first online migration target. |
| COMEN01C | `app/cbl/COMEN01C.cbl` | CM00 transaction | COCOM01Y, COMEN02Y, COMEN01 BMS | **yes** | User main menu (230 lines). Navigation hub only — no VSAM I/O. |
| COADM01C | `app/cbl/COADM01C.cbl` | CA00 transaction | COCOM01Y, COADM02Y, COADM01 BMS | **yes** | Admin menu (230 lines). Navigation hub. |
| COTRN01C | `app/cbl/COTRN01C.cbl` | CT01 transaction | CVTRA05Y, TRANSACT VSAM | **yes** | Add transaction (310 lines). Single-file write. |
| COBIL00C | `app/cbl/COBIL00C.cbl` | CB00 transaction | CVACT01Y, CVACT03Y, CVTRA05Y, 3 VSAM files | **no** | Bill payment (572 lines). Multi-file read/write. |
| COTRN02C | `app/cbl/COTRN02C.cbl` | CT02 transaction | CVTRA05Y, CVACT01Y, CVACT03Y, CALL CSUTLDTC | **no** | Transaction view (784 lines). Date utility dependency. |
| COTRN00C | `app/cbl/COTRN00C.cbl` | CT00 transaction | CVTRA05Y, TRANSACT VSAM browse | **no** | Transaction list (700 lines). STARTBR/READNEXT. |
| COUSR00C | `app/cbl/COUSR00C.cbl` | CU00 transaction | CSUSR01Y, USRSEC VSAM browse | **no** | User list (696 lines). |
| COUSR01C | `app/cbl/COUSR01C.cbl` | CU01 transaction | CSUSR01Y, USRSEC VSAM | **no** | Add user (310 lines). |
| COUSR02C | `app/cbl/COUSR02C.cbl` | CU02 transaction | CSUSR01Y, USRSEC VSAM | **no** | Update user (414 lines). |
| COUSR03C | `app/cbl/COUSR03C.cbl` | CU03 transaction | CSUSR01Y, USRSEC VSAM | **no** | Delete user (310 lines). |
| CORPT00C | `app/cbl/CORPT00C.cbl` | CR00 transaction | CVTRA05Y, CALL CSUTLDTC, WRITEQ TD | **no** | Reports (649 lines). Temporary storage queue output. |
| COACTVWC | `app/cbl/COACTVWC.cbl` | CAVW transaction | CVACT01Y, CVACT02Y, CVACT03Y, CVCUS01Y, CVCRD01Y, CSSTRPFY | **no** | View account (942 lines). 5 VSAM reads. |
| COACTUPC | `app/cbl/COACTUPC.cbl` | CAUP transaction | 15+ copybooks, CSSETATY (30 variants), CSUTLDPY, CSSTRPFY, 5 VSAM files | **no** | Update account (4,237 lines). **Highest complexity in codebase.** |
| COCRDLIC | `app/cbl/COCRDLIC.cbl` | CCLI transaction | CVCRD01Y, CVACT02Y, CARDDAT/CARDAIX VSAM browse | **no** | List cards (1,460 lines). |
| COCRDSLC | `app/cbl/COCRDSLC.cbl` | CCDL transaction | CVCRD01Y, CVACT02Y, CVCUS01Y, CSSTRPFY | **no** | Search/view card (888 lines). |
| COCRDUPC | `app/cbl/COCRDUPC.cbl` | CCUP transaction | CVCRD01Y, CVACT02Y, CVCUS01Y, CSSTRPFY | **no** | Update card (1,561 lines). |

---

## Program-Level Coupling (Base Batch)

| Program | Path | Inbound | Outbound | pilot_ready | Notes |
|---|---|---|---|:---:|---|
| CBACT01C | `app/cbl/CBACT01C.cbl` | READACCT.jcl | CVACT01Y, CALL COBDATFT, CALL CEE3ABD | **yes** | Account file read/display (430 lines). |
| CBACT02C | `app/cbl/CBACT02C.cbl` | READCARD.jcl | CVACT02Y, CALL CEE3ABD | **yes** | Card file read (158 lines). Simplest batch program. |
| CBACT03C | `app/cbl/CBACT03C.cbl` | READXREF.jcl | CVACT03Y, CALL CEE3ABD | **yes** | Cross-ref read (158 lines). |
| CBCUS01C | `app/cbl/CBCUS01C.cbl` | READCUST.jcl | CVCUS01Y, CALL CEE3ABD | **yes** | Customer read (158 lines). |
| CBACT04C | `app/cbl/CBACT04C.cbl` | INTCALC.jcl | CVACT01Y, CVACT03Y, CVTRA01Y, CVTRA02Y, CVTRA05Y | **no** | Interest calculation (653 lines). 5 copybooks, multi-file. |
| CBTRN01C | `app/cbl/CBTRN01C.cbl` | — | CVTRA06Y, CVCUS01Y, CVACT01Y–03Y, CVTRA05Y | **no** | Transaction validation (494 lines). |
| CBTRN02C | `app/cbl/CBTRN02C.cbl` | POSTTRAN.jcl | CVTRA06Y, CVTRA05Y, CVACT01Y, CVACT03Y, CVTRA01Y | **no** | Transaction posting (732 lines). Core batch logic. |
| CBTRN03C | `app/cbl/CBTRN03C.cbl` | TRANREPT.jcl | CVTRA05Y, CVACT03Y, CVTRA03Y–04Y, CVTRA07Y | **no** | Transaction reporting (649 lines). |
| CBSTM03A | `app/cbl/CBSTM03A.CBL` | CREASTMT.JCL | COSTM01, CUSTREC, CVACT01Y, CVACT03Y, CALL CBSTM03B (×11) | **no** | Statement driver (925 lines). Tight coupling to CBSTM03B. |
| CBSTM03B | `app/cbl/CBSTM03B.CBL` | CBSTM03A (CALL) | COSTM01, CUSTREC | **no** | Statement detail formatter. Called only by CBSTM03A. |
| CBEXPORT | `app/cbl/CBEXPORT.cbl` | CBEXPORT.jcl | CVCUS01Y, CVACT01Y–03Y, CVTRA05Y, CVACT02Y, CVEXPORT | **no** | Data export (582 lines). |
| CBIMPORT | `app/cbl/CBIMPORT.cbl` | CBIMPORT.jcl | Same as CBEXPORT + CALL CEE3ABD | **no** | Data import (487 lines). |
| CSUTLDTC | `app/cbl/CSUTLDTC.cbl` | COTRN02C, CORPT00C (CALL) | CALL CEEDAYS | **yes** | Date utility (116 lines). Shared by online programs. |
| COBSWAIT | `app/cbl/COBSWAIT.cbl` | WAITSTEP.jcl | CALL MVSWAIT | **yes** | Batch wait wrapper (38 lines). |

---

## Program-Level Coupling (Extensions)

| Program | Path | Module | Inbound | Outbound | pilot_ready | Notes |
|---|---|---|---|---|:---:|---|
| CODATE01 | `app/app-vsam-mq/cbl/CODATE01.cbl` | ext-vsam-mq | CDRD transaction | CMQ* copybooks, MQ API | **yes** | System date MQ service (506 lines). |
| COACCT01 | `app/app-vsam-mq/cbl/COACCT01.cbl` | ext-vsam-mq | CDRA transaction | CVACT01Y, CMQ* copybooks, MQ API | **yes** | Account inquiry via MQ (602 lines). |
| COTRTLIC | `app/app-transaction-type-db2/cbl/COTRTLIC.cbl` | ext-trntype-db2 | CTLI transaction | EXEC SQL (16), DB2 tables TRNTYPE/TRNTYCAT | **no** | List/update/delete types (2,099 lines). |
| COTRTUPC | `app/app-transaction-type-db2/cbl/COTRTUPC.cbl` | ext-trntype-db2 | CTTU transaction | EXEC SQL (7), CSUTLDWY | **no** | Add/edit types (1,703 lines). |
| COBTUPDT | `app/app-transaction-type-db2/cbl/COBTUPDT.cbl` | ext-trntype-db2 | MNTTRDB2.jcl | EXEC SQL (5) | **no** | Batch DB2 maintenance. |
| COPAUA0C | `app/app-authorization-ims-db2-mq/cbl/COPAUA0C.cbl` | ext-auth | CP00 transaction | MQ API, VSAM, IMS(via commarea) | **no** | Authorization processor (1,027 lines). |
| COPAUS0C | `app/app-authorization-ims-db2-mq/cbl/COPAUS0C.cbl` | ext-auth | CPVS transaction | CIPAUDTY, IMS browse | **no** | Auth summary screen (1,033 lines). |
| COPAUS1C | `app/app-authorization-ims-db2-mq/cbl/COPAUS1C.cbl` | ext-auth | CPVD transaction | CIPAUDTY, IMS read | **no** | Auth detail screen. |
| COPAUS2C | `app/app-authorization-ims-db2-mq/cbl/COPAUS2C.cbl` | ext-auth | — | EXEC SQL (4), DB2 fraud table | **no** | Fraud reporting. |
| CBPAUP0C | `app/app-authorization-ims-db2-mq/cbl/CBPAUP0C.cbl` | ext-auth | CBPAUP0J.jcl | CIPAUDTY, batch purge | **no** | Batch auth purge. |
| PAUDBLOD | `app/app-authorization-ims-db2-mq/cbl/PAUDBLOD.CBL` | ext-auth | LOADPADB.JCL | CALL CBLTDLI, PAUTBPCB | **no** | IMS DB load. |
| PAUDBUNL | `app/app-authorization-ims-db2-mq/cbl/PAUDBUNL.CBL` | ext-auth | UNLDPADB.JCL | CALL CBLTDLI, PAUTBPCB | **no** | IMS DB unload. |
| DBUNLDGS | `app/app-authorization-ims-db2-mq/cbl/DBUNLDGS.CBL` | ext-auth | UNLDGSAM.JCL | CALL CBLTDLI, IMSFUNCS | **no** | IMS GSAM unload. |

---

## Copybook Fan-In Matrix

Copybooks with the highest number of dependent programs (inbound coupling):

| Copybook | Path | Fan-in | Dependent modules |
|---|---|---:|---|
| COCOM01Y | `app/cpy/COCOM01Y.cpy` | 19 | base-online |
| COTTL01Y | `app/cpy/COTTL01Y.cpy` | 19 | base-online |
| CSDAT01Y | `app/cpy/CSDAT01Y.cpy` | 19 | base-online |
| CSMSG01Y | `app/cpy/CSMSG01Y.cpy` | 19 | base-online |
| CVACT01Y | `app/cpy/CVACT01Y.cpy` | 14 | base-online, base-batch |
| CVACT03Y | `app/cpy/CVACT03Y.cpy` | 14 | base-online, base-batch |
| CSUSR01Y | `app/cpy/CSUSR01Y.cpy` | 12 | base-online |
| CVTRA05Y | `app/cpy/CVTRA05Y.cpy` | 11 | base-online, base-batch |
| CVCUS01Y | `app/cpy/CVCUS01Y.cpy` | 10 | base-online, base-batch |
| CVACT02Y | `app/cpy/CVACT02Y.cpy` | 9 | base-online, base-batch |
| CIPAUDTY | `app/app-authorization-ims-db2-mq/cpy/CIPAUDTY.cpy` | 8 | ext-auth-ims-db2-mq |
| CSMSG02Y | `app/cpy/CSMSG02Y.cpy` | 6 | base-online |
| CVCRD01Y | `app/cpy/CVCRD01Y.cpy` | 5 | base-online |
| CSSTRPFY | `app/cpy/CSSTRPFY.cpy` | 5 | base-online |

---

## JCL → Program Binding

| JCL job | Path | Program(s) | Module |
|---|---|---|---|
| READACCT | `app/jcl/READACCT.jcl` | CBACT01C | base-batch |
| READCARD | `app/jcl/READCARD.jcl` | CBACT02C | base-batch |
| READXREF | `app/jcl/READXREF.jcl` | CBACT03C | base-batch |
| READCUST | `app/jcl/READCUST.jcl` | CBCUS01C | base-batch |
| POSTTRAN | `app/jcl/POSTTRAN.jcl` | CBTRN02C | base-batch |
| INTCALC | `app/jcl/INTCALC.jcl` | CBACT04C | base-batch |
| TRANREPT | `app/jcl/TRANREPT.jcl` | CBTRN03C | base-batch |
| CREASTMT | `app/jcl/CREASTMT.JCL` | CBSTM03A | base-batch |
| CBEXPORT | `app/jcl/CBEXPORT.jcl` | CBEXPORT | base-batch |
| CBIMPORT | `app/jcl/CBIMPORT.jcl` | CBIMPORT | base-batch |
| WAITSTEP | `app/jcl/WAITSTEP.jcl` | COBSWAIT | base-batch |
| CBADMCDJ | `app/jcl/CBADMCDJ.jcl` | DFHCSDUP | base-csd |
| CREADB21 | `app/app-transaction-type-db2/jcl/CREADB21.jcl` | DSNTEP4 | ext-trntype-db2 |
| TRANEXTR | `app/app-transaction-type-db2/jcl/TRANEXTR.jcl` | DSNTIAUL | ext-trntype-db2 |
| MNTTRDB2 | `app/app-transaction-type-db2/jcl/MNTTRDB2.jcl` | COBTUPDT | ext-trntype-db2 |
| LOADPADB | `app/app-authorization-ims-db2-mq/jcl/LOADPADB.JCL` | PAUDBLOD | ext-auth-ims-db2-mq |
| UNLDPADB | `app/app-authorization-ims-db2-mq/jcl/UNLDPADB.JCL` | PAUDBUNL | ext-auth-ims-db2-mq |

---

## Coupling Heat Summary

```
Coupling intensity (inbound module references):

base-copybooks  ████████████████████  (4 modules depend)
base-bms        ████████████          (3 modules depend)
base-batch      ████████              (2 modules depend)
base-asm        ████                  (1 module depends)
base-csd        ████                  (1 module depends)
ext-vsam-mq     ░                     (0 inbound — leaf module)
ext-trntype-db2 ░                     (0 inbound — leaf module)
ext-auth        ░                     (0 inbound — leaf module)
```

**Leaf modules** (no inbound module deps) are optional extensions — they consume base artifacts but nothing in-repo depends on them. This makes them safe pilot candidates.

**Hub modules** (`base-copybooks`, `base-bms`) must be migrated or stubbed before dependent programs can be recompiled against a new target.

---

## Pilot Selection Matrix

| Candidate | Lines | Inbound modules | Outbound deps | Isolation | Recommendation |
|---|---:|---|---|---|---|
| `app/cpy/` copybooks | — | 4 | 0 | High | **Start here** — data model extraction |
| `CODATE01.cbl` | 506 | 0 | MQ + 0 base copybooks | High | **Pilot program #1** |
| `COACCT01.cbl` | 602 | 0 | MQ + CVACT01Y | High | **Pilot program #2** |
| `CBCUS01C.cbl` | 158 | 1 (JCL) | 1 copybook | High | **Pilot batch #1** |
| `COSGN00C.cbl` | 258 | 0 | 5 copybooks + USRSEC | Medium | First online target after data layer |
| `COACTUPC.cbl` | 4,237 | 0 | 15+ copybooks + 5 VSAM | Low | **Defer** — decompose first |

See `assessment.md` for phased migration plan and risk detail.
