# CardDemo Modernization Wave Plan

Generated: 2026-07-01T02:58:30.374Z

## Executive Summary

This wave plan sequences CardDemo modernization from foundation artifacts through optional multi-stack extensions. Waves respect module dependencies identified in `inventory.json` and prioritize `pilot_ready` components for early validation.

| Metric | Value |
| --- | --- |
| Repository | CardDemo |
| Inventory snapshot | 2026-07-01T02:57:58.996Z |
| Total waves | 6 |
| COBOL programs | 44 |
| Total lines of COBOL | 30,219 |
| Pilot-ready programs | 12 |

## Wave Sequence Overview

```
Wave 1  Foundation (copybooks, BMS, asm, CSD, tooling)
  │
Wave 2  Pilot (MQ extension + simple batch readers)
  │
Wave 3  Core batch pipeline (posting, interest, statements)
  │
Wave 4  Core online (CICS screens, excluding monoliths)
  │
Wave 5  DB2 transaction type extension
  │
Wave 6  IMS/DB2/MQ authorization extension
  │
  └──► Deferred: COACTUPC, CBSTM03A (decompose first)
```

## Module Dependency Context

| Module | Kind | Pilot ready | Outbound dependencies |
| --- | --- | :---: | --- |
| Base copybooks | foundation | yes | — |
| Base BMS maps | foundation | yes | — |
| Assembler utilities | foundation | yes | — |
| CICS CSD definitions | foundation | yes | — |
| Build samples | tooling | yes | — |
| Dev tooling scripts | tooling | yes | — |
| Base JCL | foundation | yes | base-batch |
| VSAM/MQ extension | extension | yes | base-copybooks, system:ibm-mq |
| Base batch programs | batch | yes | base-copybooks, base-asm, system:lang-runtime |
| Base online programs | online | no | base-copybooks, base-bms, base-csd, base-batch, system:cics-bms |
| Transaction type DB2 extension | extension | no | base-copybooks, base-bms, system:db2 |
| Authorization IMS/DB2/MQ extension | extension | no | base-copybooks, base-bms, system:ibm-mq, system:ims-dli, system:db2 |

## Wave 1: Foundation — data contracts and platform definitions

**Objective:** Extract VSAM record layouts, BMS screen maps, assembler utilities, and CICS resource definitions before any runtime migration.

**Prerequisites:** None
**Risk:** low
**Scope:** 0 programs (0 lines), 0 JCL jobs
**Technologies:** assembler, bms, cics, copybook, jcl, shell

| Item | Type | Lines | Pilot | Notes |
| --- | --- | ---: | :---: | --- |
| Base copybooks | module | — | yes | foundation module; outbound deps: none |
| Base BMS maps | module | — | yes | foundation module; outbound deps: none |
| Assembler utilities | module | — | yes | foundation module; outbound deps: none |
| CICS CSD definitions | module | — | yes | foundation module; outbound deps: none |
| Build samples | module | — | yes | tooling module; outbound deps: none |
| Dev tooling scripts | module | — | yes | tooling module; outbound deps: none |
| High fan-in copybooks | copybook-group | — | yes | COCOM01Y (19), COTTL01Y (19), CSDAT01Y (19), CSMSG01Y (19), CVACT01Y (14), CVACT03Y (14), CSUSR01Y (12), CVTRA05Y (11), CVCUS01Y (10), CVACT02Y (9) |

## Wave 2: Pilot — isolated MQ services and simple batch readers

**Objective:** Validate copybook mapping and middleware translation with leaf modules that have no inbound repo dependencies.

**Prerequisites:** Wave 1
**Risk:** low
**Scope:** 8 programs (2,314 lines), 5 JCL jobs
**Technologies:** cobol

| Item | Type | Lines | Pilot | Notes |
| --- | --- | ---: | :---: | --- |
| VSAM/MQ extension | module | — | yes | extension module; outbound deps: base-copybooks, system:ibm-mq |
| Base batch programs | module | — | yes | batch module; outbound deps: base-copybooks, base-asm, system:lang-runtime |
| COBSWAIT | program | 42 | yes | utility; low complexity; jobs: WAITSTEP |
| CSUTLDTC | program | 158 | yes | utility; low complexity |
| CBACT02C | program | 179 | yes | batch; low complexity; jobs: READCARD |
| CBACT03C | program | 179 | yes | batch; low complexity; jobs: READXREF |
| CBCUS01C | program | 179 | yes | batch; low complexity; jobs: READCUST |
| CBACT01C | program | 431 | yes | batch; low complexity; jobs: READACCT |
| CODATE01 | program | 525 | yes | online; trans CDRD; low complexity |
| COACCT01 | program | 621 | yes | online; trans CDRA; low complexity |
| READACCT | jcl | — | yes | PGM=CBACT01C |
| READCARD | jcl | — | yes | PGM=CBACT02C |
| READCUST | jcl | — | yes | PGM=CBCUS01C |
| READXREF | jcl | — | yes | PGM=CBACT03C |
| WAITSTEP | jcl | — | yes | PGM=COBSWAIT |

## Wave 3: Core batch pipeline

**Objective:** Migrate transaction posting, interest calculation, statement generation, and import/export after data contracts are stable.

**Prerequisites:** Wave 1, Wave 2
**Risk:** medium
**Scope:** 7 programs (3,832 lines), 33 JCL jobs
**Technologies:** cobol, jcl

| Item | Type | Lines | Pilot | Notes |
| --- | --- | ---: | :---: | --- |
| Base JCL | module | — | yes | foundation module; outbound deps: base-batch |
| Base batch programs | module | — | yes | batch module; outbound deps: base-copybooks, base-asm, system:lang-runtime |
| CBSTM03B | program | 231 | no | batch; low complexity |
| CBIMPORT | program | 488 | no | batch; low complexity; jobs: CBIMPORT |
| CBTRN01C | program | 495 | no | batch; low complexity |
| CBEXPORT | program | 583 | no | batch; low complexity; jobs: CBEXPORT |
| CBTRN03C | program | 650 | no | batch; low complexity; jobs: TRANREPT |
| CBACT04C | program | 653 | no | batch; low complexity; jobs: INTCALC |
| CBTRN02C | program | 732 | no | batch; low complexity; jobs: POSTTRAN |
| ACCTFILE | jcl | — | yes | utility job |
| CARDFILE | jcl | — | no | PGM=SDSF |
| CBADMCDJ | jcl | — | yes | utility job |
| CBEXPORT | jcl | — | no | PGM=CBEXPORT |
| CBIMPORT | jcl | — | no | PGM=CBIMPORT |
| CLOSEFIL | jcl | — | no | PGM=SDSF |
| COMBTRAN | jcl | — | yes | utility job |
| CREASTMT | jcl | — | no | PGM=CBSTM03A |
| CUSTFILE | jcl | — | no | PGM=SDSF |
| DALYREJS | jcl | — | yes | utility job |
| DEFCUST | jcl | — | yes | utility job |
| DEFGDGB | jcl | — | yes | utility job |
| DEFGDGD | jcl | — | yes | utility job |
| DISCGRP | jcl | — | yes | utility job |
| DUSRSECJ | jcl | — | yes | utility job |
| ESDSRRDS | jcl | — | yes | utility job |
| FTPJCL | jcl | — | no | PGM=FTP |
| INTCALC | jcl | — | no | PGM=CBACT04C |
| INTRDRJ1 | jcl | — | yes | utility job |
| INTRDRJ2 | jcl | — | yes | utility job |
| OPENFIL | jcl | — | no | PGM=SDSF |
| POSTTRAN | jcl | — | no | PGM=CBTRN02C |
| PRTCATBL | jcl | — | yes | utility job |
| REPTFILE | jcl | — | yes | utility job |
| TCATBALF | jcl | — | yes | utility job |
| TRANBKP | jcl | — | yes | utility job |
| TRANCATG | jcl | — | yes | utility job |
| TRANFILE | jcl | — | no | PGM=SDSF |
| TRANIDX | jcl | — | yes | utility job |
| TRANREPT | jcl | — | no | PGM=CBTRN03C |
| TRANTYPE | jcl | — | yes | utility job |
| TXT2PDF1 | jcl | — | no | PGM=IKJEFT1B |
| XREFFILE | jcl | — | yes | utility job |

## Wave 4: Core online — CICS transactions and screens

**Objective:** Modernize sign-on, menus, and account/card/transaction screens; defer the largest monoliths until patterns are proven.

**Prerequisites:** Wave 1, Wave 3
**Risk:** high
**Scope:** 16 programs (10,519 lines), 0 JCL jobs
**Technologies:** cobol

| Item | Type | Lines | Pilot | Notes |
| --- | --- | ---: | :---: | --- |
| Base online programs | module | — | no | online module; outbound deps: base-copybooks, base-bms, base-csd, base-batch, system:cics-bms |
| COSGN00C | program | 261 | yes | online; trans CC00; low complexity |
| COADM01C | program | 289 | yes | online; trans CA00; low complexity |
| COUSR01C | program | 300 | no | online; trans CU01; low complexity |
| COMEN01C | program | 309 | yes | online; trans CM00; low complexity |
| COTRN01C | program | 331 | yes | online; trans CT01; low complexity |
| COUSR03C | program | 360 | no | online; trans CU03; low complexity |
| COUSR02C | program | 415 | no | online; trans CU02; low complexity |
| COBIL00C | program | 573 | no | online; trans CB00; medium complexity |
| CORPT00C | program | 650 | no | online; trans CR00; low complexity |
| COUSR00C | program | 696 | no | online; trans CU00; medium complexity |
| COTRN00C | program | 700 | no | online; trans CT00; low complexity |
| COTRN02C | program | 784 | no | online; trans CT02; medium complexity |
| COCRDSLC | program | 888 | no | online; trans CCDL; medium complexity |
| COACTVWC | program | 942 | no | online; trans CAVW; medium complexity |
| COCRDLIC | program | 1460 | no | online; trans CCLI; medium complexity |
| COCRDUPC | program | 1561 | no | online; trans CCUP; medium complexity |

## Wave 5: DB2 transaction type extension

**Objective:** Migrate embedded SQL programs and DB2 schema after core VSAM and online flows are validated.

**Prerequisites:** Wave 1, Wave 4
**Risk:** medium
**Scope:** 3 programs (4,040 lines), 3 JCL jobs
**Technologies:** cobol

| Item | Type | Lines | Pilot | Notes |
| --- | --- | ---: | :---: | --- |
| Transaction type DB2 extension | module | — | no | extension module; outbound deps: base-copybooks, base-bms, system:db2 |
| COBTUPDT | program | 238 | no | batch; low complexity |
| COTRTUPC | program | 1703 | no | online; trans CTTU; high complexity |
| COTRTLIC | program | 2099 | no | online; trans CTLI; high complexity |
| CREADB21 | jcl | — | yes | utility job |
| MNTTRDB2 | jcl | — | yes | utility job |
| TRANEXTR | jcl | — | yes | utility job |

## Wave 6: IMS/DB2/MQ authorization extension

**Objective:** Tackle the triple-stack authorization module last, once MQ patterns and DB2 migration are established.

**Prerequisites:** Wave 1, Wave 2, Wave 5
**Risk:** high
**Scope:** 8 programs (4,352 lines), 5 JCL jobs
**Technologies:** cobol

| Item | Type | Lines | Pilot | Notes |
| --- | --- | ---: | :---: | --- |
| Authorization IMS/DB2/MQ extension | module | — | no | extension module; outbound deps: base-copybooks, base-bms, system:ibm-mq, system:ims-dli, system:db2 |
| COPAUS2C | program | 245 | no | batch; low complexity |
| PAUDBUNL | program | 318 | no | batch; medium complexity |
| DBUNLDGS | program | 367 | no | batch; medium complexity |
| PAUDBLOD | program | 370 | no | batch; medium complexity |
| CBPAUP0C | program | 387 | no | batch; medium complexity |
| COPAUS1C | program | 605 | no | online; trans CPVD; medium complexity |
| COPAUA0C | program | 1027 | no | online; trans CP00; high complexity |
| COPAUS0C | program | 1033 | no | online; trans CPVS; high complexity |
| CBPAUP0J | jcl | — | no | PGM=DFSRRC00 |
| DBPAUTP0 | jcl | — | no | PGM=DFSRRC00 |
| LOADPADB | jcl | — | no | PGM=DFSRRC00 |
| UNLDGSAM | jcl | — | no | PGM=DFSRRC00 |
| UNLDPADB | jcl | — | no | PGM=DFSRRC00 |

## Deferred Components

These high-complexity programs should be decomposed into smaller services before assignment to a migration wave.

| Program | Lines | Rationale |
| --- | ---: | --- |
| CBSTM03A | 925 | Deferred — 925 lines, medium complexity; decompose before migration |
| COACTUPC | 4237 | Deferred — 4237 lines, high complexity; decompose before migration |

## System Dependencies by Wave

| System | Required starting wave | Consumed by |
| --- | ---: | --- |
| system:cics-bms | 4 | base-online, ext-trntype-db2, ext-auth-ims-db2-mq |
| system:ibm-mq | 2 | ext-vsam-mq, ext-auth-ims-db2-mq |
| system:ims-dli | 6 | ext-auth-ims-db2-mq |
| system:db2 | 5 | ext-trntype-db2, ext-auth-ims-db2-mq |
| system:lang-runtime | 3 | base-batch |
| system:zos-util | 3 | base-jcl |

## Success Criteria

1. **Wave 1 complete** — All VSAM record layouts (`CV*.cpy`) documented in target schema; BMS maps catalogued.
2. **Wave 2 complete** — `CODATE01` and `COACCT01` MQ request/response behavior replicated; batch readers produce equivalent output.
3. **Wave 3 complete** — `POSTTRAN`/`CBTRN02C`, `INTCALC`/`CBACT04C`, and `CREASTMT` pipeline runs end-to-end on target platform.
4. **Wave 4 complete** — CC00 sign-on through main menu and at least one account/card/transaction flow operational.
5. **Wave 5 complete** — DB2 transaction type CRUD (CTTU, CTLI) and batch extract (`TRANEXTR`) validated.
6. **Wave 6 complete** — Authorization MQ trigger, IMS browse, and DB2 fraud logging integrated.

---

_Report generated by `scripts/plan-waves.ts`. Re-run with `npm run plan-waves` after updating `inventory.json`._