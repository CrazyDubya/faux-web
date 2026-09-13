# Open-source banking stack reuse review

This note reviews the listed open-source banking and payments projects for components or ideas that can be reused inside FauxBank. It focuses on what to copy or adapt (data models, APIs, flows, controls) rather than full integrations.

## Task list to import, duplicate, or reimagine components

### Core banking platforms ("run a bank" backbone)

- **Apache Fineract** (credit: Apache Fineract project)
  - [ ] Lift the reference data model for customers, loans, savings, and charges into FauxBank schemas.
  - [ ] Mirror REST resource structure and idempotency headers in FauxBank API design.
  - [ ] Map Fineract double-entry GL constructs to FauxBank’s ledger engine.
- **Mifos X** (credit: openMF/mifos-x)
  - [ ] Recreate tenant-aware service boundaries (portfolio, accounting, identity) in service layout.
  - [ ] Port loan lifecycle, arrears, and fee accrual request/response schemas for API parity.
  - [ ] Adapt permission matrix and maker-checker workflow for FauxBank admin controls.
  - [ ] Draft migration guide from Mifos X payloads to FauxBank equivalents.

### Open banking APIs ("expose/operate bank APIs" layer)

- **OpenBankProject / OBP-API** (credit: OpenBankProject)
  - [ ] Reproduce PSD2-style resource taxonomy (accounts → views → transactions → entitlements).
  - [ ] Implement consent-based access model and entitlement management.
  - [ ] Seed open-banking façade fields (transactions + metadata) from OBP-API specs.
- **leggen** (credit: leggen project)
  - [ ] Duplicate unified bank-connection objects (institution, credentials, sync status).
  - [ ] Build webhook-driven sync model for transaction import flows.
  - [ ] Provide CLI-style operational commands as admin utilities for connections.

### Payments / switches / rails ("move money" layer)

- **Mojaloop** (credit: Mojaloop Foundation)
  - [ ] Implement FSP Interoperability API message shapes (payer/payee, quotes → transfers).
  - [ ] Simulate settlement window handling for batch reconciliation tests.
  - [ ] Create sample DFSP adapters wired to FauxBank accounts.
- **Mifos Core Connector** (credit: mojaloop/mifos-core-connector)
  - [ ] Port mapping templates between FauxBank accounts and Mojaloop parties/payment addresses.
  - [ ] Validate adapter flow with Mojaloop simulator test cases.
- **Hyperswitch Control Center** (credit: Hyperswitch project)
  - [ ] Reuse provider-credential abstraction for multi-PSP support.
  - [ ] Configure routing rule definitions to model failover/priority logic.
  - [ ] Add dashboard mocks showing route decisions and provider health.
- **Conductor (malwarebo/gopay)** (credit: malwarebo/gopay)
  - [ ] Copy the pluggable provider interface and payment status state machine (created → pending → succeeded/failed).
  - [ ] Normalize provider callbacks into the shared state machine transitions.
  - [ ] Publish sandbox providers to exercise status transitions.

### Ledgers / accounting engines ("truth source of balances" layer)

- **blnkfinance/blnk** (credit: blnkfinance/blnk)
  - [ ] Reuse ledger primitives (accounts, entries, postings) in FauxBank’s double-entry core.
  - [ ] Integrate workflow hooks for transaction approval/rollback.
  - [ ] Align posting validation rules with blnk defaults for parity.
- **LerianStudio/midaz** (credit: LerianStudio/midaz)
  - [ ] Adopt command-side write and query-side projection split for ledger performance.
  - [ ] Use event schemas to seed audit log formats and downstream projections.
- **ledger/ledger** (credit: ledger/ledger)
  - [ ] Adapt posting syntax and commodity handling for CLI-based internal tooling.
  - [ ] Provide reconciliation script templates inspired by ledger CLI workflows.
- **ledgersmb/LedgerSMB** (credit: ledgersmb/LedgerSMB)
  - [ ] Import chart-of-accounts templates tailored for SME/biz banking.
  - [ ] Model AR/AP invoice flows for business banking journeys.

### Ops / architecture references

- **DeloitteDigitalAT/core-banking** (credit: DeloitteDigitalAT/core-banking)
  - [ ] Apply patterns for idempotent messaging, retry/circuit breaking, and saga workflows.
  - [ ] Add chaos/latency test cases to validate resilience patterns.
- **tazama-demo** (credit: tazama-demo)
  - [ ] Prototype streaming ingestion pipeline for telemetry and alerts.
  - [ ] Implement rule-based alerting mocks for fraud/AML scenarios.

### Bank simulation / toy systems

- **banking-project/banksim** (credit: banking-project/banksim)
  - [ ] Recreate agent-based simulation drivers (customers, tellers, regulators) to generate transaction narratives.
  - [ ] Feed simulated events into FauxBank transaction pipeline for demos.
- **osanseviero/Bank-Simulation** (credit: osanseviero/Bank-Simulation)
  - [ ] Use queue/arrival/service time distributions to model branch/support congestion in load tests.
  - [ ] Parameterize arrival distributions for spike/load scenarios.
- **Bank Management System demos** (credit: assorted OSS demos)
  - [ ] Lift CRUD scaffolding (customer → account → transaction) for quickstart examples.
  - [ ] Bundle as onboarding tutorials for FauxBank API users.
