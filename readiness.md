# Agentic Readiness Report

**Repository:** CardDemo (`aws-mainframe-modernization-carddemo`)  
**Generated:** 2026-07-01  
**Scope:** All HTTP routes in the repository

## Executive Summary

| Status | Count |
|--------|------:|
| Ready | 0 |
| Needs Work | 0 |
| Blocked | 0 |

This repository contains **no HTTP routes**. CardDemo is a mainframe CICS/COBOL application with 3270 terminal transactions, IBM MQ message interfaces, and JCL batch jobs. There is no web server, REST framework, or OpenAPI specification in the codebase. HTTP-based agent access is therefore unavailable today.

Web Service connectivity is listed on the project roadmap (`README.md`) but is not implemented.

---

## Scoring Methodology

Each HTTP route is scored **0–100** using eight weighted dimensions:

| Dimension | Weight | What we evaluate |
|-----------|-------:|------------------|
| Discoverability | 15 | OpenAPI/spec, route catalog, machine-readable documentation |
| Schema | 15 | Typed request/response bodies, validation rules, examples |
| Authentication | 10 | Token, API-key, or OAuth model that agents can use programmatically |
| Error contract | 10 | Standard HTTP status codes and structured error payloads |
| Idempotency | 10 | Safe retries, correlation IDs, idempotency keys |
| Observability | 10 | Logging, tracing, and request correlation support |
| Testing | 15 | Fixtures, integration tests, CI coverage for the route |
| Autonomy | 15 | No human-in-the-loop or 3270 terminal required; deterministic behavior |

**Classification thresholds:**

- **Ready** — score ≥ 70
- **Needs Work** — score 40–69
- **Blocked** — score < 40, or no HTTP implementation exists

---

## Scan Coverage

Full-repository scan (329 files) checked for:

- Web frameworks: Express, FastAPI, Spring Boot, Gin, Flask, Actix, etc.
- Route handlers: `@app.get`, `@RequestMapping`, `router.post`, `http.HandleFunc`, etc.
- API specifications: OpenAPI, Swagger, WSDL, RAML
- Common API paths: `/api/*`, REST gateway configs, `server.js` / `main.py` entry points

**Technologies found:** COBOL, CICS, VSAM, JCL, BMS, IBM MQ, IMS DB, DB2, Assembler  
**HTTP route definitions found:** 0

---

## HTTP Route Inventory

| Method | Path | Handler | File | Score | Status |
|--------|------|---------|------|------:|--------|
| — | — | — | — | — | *No routes found* |

---

## Ready

No HTTP routes meet the ready threshold (≥ 70).

---

## Needs Work

No HTTP routes scored in the needs-work range (40–69).

---

## Blocked

### Infrastructure — no HTTP layer

| Surface | Score | Blockers |
|---------|------:|----------|
| HTTP/REST API | 0 | No web server, route handlers, or API gateway configuration in the repository |
| OpenAPI specification | 0 | No machine-readable API catalog for agents to discover endpoints |
| Programmatic authentication | 0 | Security is CICS/RACF sign-on via transaction `CC00`; no API-key or token model |

**Evidence:**

- No `.py`, `.js`, `.ts`, `.go`, or `.java` source files in the repository
- No `package.json`, `requirements.txt`, or OpenAPI/Swagger files
- Roadmap item in `README.md`: *"Web Service connectivity"* and *"Exposure of transactions for distributed application integration"* — planned, not shipped

---

## Related Non-HTTP Entry Points (Informational)

These surfaces are **not HTTP routes** and were not counted in the summary above. They represent the closest programmatic interfaces available today and would require an HTTP wrapper before agents could call them over REST.

| Interface | Type | Score | Primary blockers |
|-----------|------|------:|------------------|
| `AWS.M2.CARDDEMO.PAUTH.REQUEST` → `AWS.M2.CARDDEMO.PAUTH.REPLY` | MQ (CP00) | 58 | CSV message format documented in `app/app-authorization-ims-db2-mq/README.md`; requires MQ + IMS + DB2 runtime; no HTTP binding |
| `CARDDEMO.REQUEST.QUEUE` (message type `DATE`) | MQ (CDRD) | 52 | Copybook-defined request/response in `app/app-vsam-mq/README.md`; requires CICS + MQ; synchronous pattern over async queues |
| `CARDDEMO.REQUEST.QUEUE` (message type `ACCT`) | MQ (CDRA) | 54 | Account inquiry via MQ with VSAM lookup; fixed-width response buffer; no JSON schema |
| CICS transactions `CC00`, `CM00`, `CAVW`, `CAUP`, `CCLI`, `CCDL`, `CCUP`, `CT00`, `CT01`, `CT02`, `CR00`, `CB00`, `CA00`, `CU00`–`CU03`, `CPVS`, `CPVD`, `CTTU`, `CTLI` | 3270 terminal | 18 | BMS screen-driven flows; require terminal emulation; side effects not machine-documented per transaction |

CICS transaction definitions: `app/csd/CARDDEMO.CSD`, `app/app-authorization-ims-db2-mq/csd/CRDDEMO2.csd`, `app/app-transaction-type-db2/csd/CRDDEMOD.csd`, `app/app-vsam-mq/csd/CRDDEMOM.csd`.

---

## Recommendations

1. **Add an HTTP gateway** exposing high-value flows first: account inquiry, transaction add, authorization request/response.
2. **Publish OpenAPI 3.x specs** for every exposed route, with JSON Schema for request and response bodies.
3. **Implement agent-friendly authentication** (API keys or OAuth2) decoupled from CICS terminal sign-on.
4. **Standardize error responses** with HTTP status codes and structured error objects (code, message, retryable flag).
5. **Add integration tests and fixtures** with sample JSON payloads alongside existing EBCDIC test data.
6. **Document side effects and idempotency** per endpoint so agents can safely retry operations.

---

## Appendix: CICS Transaction Reference

For teams planning HTTP wrappers, these are the underlying online entry points documented in `README.md`:

| Transaction | Program | Function |
|-------------|---------|----------|
| CC00 | COSGN00C | Sign-on |
| CM00 | COMEN01C | Main menu |
| CAVW | COACTVWC | Account view |
| CAUP | COACTUPC | Account update |
| CCLI | COCRDLIC | Credit card list |
| CCDL | COCRDSLC | Credit card view |
| CCUP | COCRDUPC | Credit card update |
| CT00 | COTRN00C | Transaction list |
| CT01 | COTRN01C | Transaction view |
| CT02 | COTRN02C | Transaction add |
| CR00 | CORPT00C | Transaction reports |
| CB00 | COBIL00C | Bill payment |
| CA00 | COADM01C | Admin menu |
| CU00 | COUSR00C | List users |
| CU01 | COUSR01C | Add user |
| CU02 | COUSR02C | Update user |
| CU03 | COUSR03C | Delete user |
| CP00 | COPAUA0C | Process authorization requests (MQ) |
| CPVS | COPAUS0C | Pending authorization summary |
| CPVD | COPAUS1C | Pending authorization details |
| CTTU | COTRTUPC | Transaction type add/edit |
| CTLI | COTRTLIC | Transaction type list/update/delete |
| CDRD | CODATE01 | System date inquiry via MQ |
| CDRA | COACCT01 | Account details inquiry via MQ |
