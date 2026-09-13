# FauxBank

Autonomous Banking Simulation Platform for testing agentic e-commerce systems.

## Overview

FauxBank provides a full-service simulated banking platform that serves as the economic backbone for testing agentic e-commerce systems. It offers manipulation-resistant, audit-complete banking services using obviously-fake alpha-character account identifiers.

## Key Features

- **Complete Banking Simulation**: Full retail and commercial banking services
- **Manipulation Resistance**: Security through structural impossibility
- **Alpha-Only Account IDs**: Format `XX-XXXX-XXXXXXXX-XX` makes confusion with real accounts impossible
- **Double-Entry Ledger**: Every transaction debits one account and credits another
- **Agent-Based Access Control**: Registered agents with specific capabilities and rate limits
- **Compliance Simulation**: KYC, disputes, and regulatory workflows

## Account Types

| Code | Type                   | Segments        |
|------|------------------------|-----------------|
| CH   | Checking               | RETL, COMM, GOVT|
| SV   | Savings                | RETL, COMM      |
| MM   | Money Market           | RETL, COMM      |
| CD   | Certificate of Deposit | RETL, COMM      |
| LN   | Loan                   | RETL, COMM      |
| MG   | Mortgage               | RETL            |
| CC   | Credit Card            | RETL, COMM      |
| LC   | Line of Credit         | RETL, COMM      |
| MC   | Merchant Account       | COMM            |
| TR   | Trust Account          | RETL            |
| ES   | Escrow                 | COMM            |
| OP   | Operating Account      | COMM            |

## Quick Start

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)

### Installation

```bash
npm install
```

### Database Setup

```bash
# Create local database
wrangler d1 create fauxbank-db --local

# Run migrations
npm run db:migrate
```

### Development

```bash
npm run dev
```

### API Endpoints

#### Agent Registration (No Auth Required)

```bash
POST /v1/agents/register
{
  "agent_id": "my-test-agent",
  "agent_type": "ECOMMERCE_MERCHANT",
  "capabilities_requested": ["MERCHANT_PROCESSING", "BALANCE_READ"]
}
```

#### Create Account

```bash
POST /v1/accounts
Authorization: Bearer {agent_token}
{
  "type": "CH",
  "segment": "RETL",
  "owner_id": "CUST-EXAMPLE",
  "name": "My Checking Account",
  "initial_deposit": { "value": 100000, "currency": "FXUSD" }
}
```

#### Get Balance

```bash
GET /v1/accounts/{accountId}/balance
Authorization: Bearer {agent_token}
```

#### Post Transaction

```bash
POST /v1/transactions
Authorization: Bearer {agent_token}
{
  "type": "TRANSFER",
  "amount": { "value": 10000, "currency": "FXUSD" },
  "debit_account": "CH-RETL-SOURCACC-XX",
  "credit_account": "CH-RETL-DESTACC-YY",
  "memo": "Payment for services"
}
```

#### Card Authorization (Merchant)

```bash
POST /v1/commercial/merchant/authorize
Authorization: Bearer {agent_token}
{
  "merchant_account": "MC-COMM-MYMERCH-XX",
  "card_token": "CARD-CH-RETL-CUSTOMER-XX",
  "amount": { "value": 5000, "currency": "FXUSD" },
  "order_reference": "ORDER-123"
}
```

## Currency

All amounts are in FauxUSD (FXUSD), specified in cents (smallest currency unit):

- `100` = F$1.00
- `150000` = F$1,500.00

## Error Codes

| Code    | Category    | Description           |
|---------|-------------|-----------------------|
| FB-1001 | AUTH        | Invalid credentials   |
| FB-1002 | AUTH        | Token expired         |
| FB-1003 | AUTH        | Insufficient permissions |
| FB-2001 | ACCOUNT     | Account not found     |
| FB-2002 | ACCOUNT     | Account frozen        |
| FB-2003 | ACCOUNT     | Account closed        |
| FB-2004 | ACCOUNT     | Invalid account format|
| FB-3001 | TRANSACTION | Insufficient funds    |
| FB-3002 | TRANSACTION | Limit exceeded        |
| FB-3003 | TRANSACTION | Duplicate transaction |
| FB-5001 | RATE_LIMIT  | Too many requests     |

## Testing Features

### Failure Injection

```bash
POST /v1/testing/network/inject-failure
{
  "network": "FAUXVISA",
  "failure_type": "DECLINED",
  "probability": 0.1,
  "duration_seconds": 3600
}
```

### Time Advancement

```bash
POST /v1/testing/time/advance
{
  "advance_by": "P30D"  # Advance 30 days
}
```

### Environment Reset

```bash
POST /v1/testing/reset
{
  "preserve_agents": true,
  "seed_scenario": "RETAIL_DEMO"
}
```

## Architecture

- **Edge Runtime**: Cloudflare Workers
- **Database**: D1 (SQLite at edge)
- **Session Cache**: Workers KV
- **Per-Account Consistency**: Durable Objects
- **API Framework**: Hono

## Core Principles

1. **Artifacts Persist, Conversations Don't**: Ledger entries are authoritative
2. **Incapacity Over Policy**: Security through structural impossibility
3. **Claims Become Hypotheses**: All assertions verified against data
4. **Separation of Economic Authority**: Agents have limited, defined capabilities

## License

MIT
