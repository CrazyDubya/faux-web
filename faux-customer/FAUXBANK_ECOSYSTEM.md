# fauxBank Ecosystem Documentation

## Overview

**fauxBank** is an autonomous banking simulation platform that serves as the economic backbone for testing agentic e-commerce systems. It provides complete, manipulation-resistant banking services using obviously-fake alpha-character account identifiers.

**fauxCustomer** operates within this ecosystem as an agentic customer simulator that interacts with fauxBank (and fauxShop) to test and demonstrate realistic e-commerce and banking workflows.

## Shared Ecosystem

The fauxBank ecosystem consists of interconnected simulation platforms:

- **fauxBank**: The banking and financial services platform
- **fauxCustomer**: Autonomous customer agents that interact with banking and shopping services
- **fauxShop**: E-commerce platform (future integration)

### Ecosystem Principles

1. **Artifacts Persist, Conversations Don't**: All transactions and ledger entries are authoritative and permanent
2. **Incapacity Over Policy**: Security through structural impossibility rather than access control
3. **Claims Become Hypotheses**: All assertions are verified against actual data
4. **Separation of Economic Authority**: Agents have limited, well-defined capabilities

## fauxBank Architecture

### Technology Stack

- **Edge Runtime**: Cloudflare Workers
- **Database**: D1 (SQLite at edge)
- **Session Cache**: Workers KV
- **Per-Account Consistency**: Durable Objects
- **API Framework**: Hono (v4.6.0+)
- **Language**: TypeScript (v5.7.0+)
- **Validation**: Zod (v3.23.0+)

### Directory Structure

```
fauxBank/
├── src/
│   ├── durable-objects/    # Per-account consistency objects
│   ├── middleware/         # Auth, validation, rate limiting
│   ├── routes/             # API endpoint handlers
│   ├── services/           # Business logic
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Helper functions
│   └── index.ts            # Main application entry
├── migrations/             # Database migrations
├── frontend/               # Web UI (if applicable)
├── docs/                   # Additional documentation
└── wrangler.toml          # Cloudflare Workers configuration
```

## Account System

### Account Types and Codes

fauxBank supports a comprehensive range of account types using two-letter codes:

| Code | Type                   | Segments        | Description |
|------|------------------------|-----------------|-------------|
| CH   | Checking               | RETL, COMM, GOVT| Standard checking accounts |
| SV   | Savings                | RETL, COMM      | Interest-bearing savings |
| MM   | Money Market           | RETL, COMM      | Higher-yield savings |
| CD   | Certificate of Deposit | RETL, COMM      | Time-locked deposits |
| LN   | Loan                   | RETL, COMM      | Personal/business loans |
| MG   | Mortgage               | RETL            | Home mortgages |
| CC   | Credit Card            | RETL, COMM      | Revolving credit |
| LC   | Line of Credit         | RETL, COMM      | Flexible credit line |
| MC   | Merchant Account       | COMM            | For accepting payments |
| TR   | Trust Account          | RETL            | Trust and estate accounts |
| ES   | Escrow                 | COMM            | Third-party holding |
| OP   | Operating Account      | COMM            | Business operations |

### Account Segments

- **RETL**: Retail/consumer accounts
- **COMM**: Commercial/business accounts
- **GOVT**: Government accounts

### Account ID Format

Account identifiers use the format: `XX-XXXX-XXXXXXXX-XX`

Example: `CH-RETL-SOURCACC-XX`

- Uses alpha characters only (no numbers)
- Makes confusion with real account numbers structurally impossible
- Human-readable and memorable

## Currency: FauxUSD (FXUSD)

All monetary amounts in fauxBank are denominated in FauxUSD (FXUSD) and specified in cents (smallest currency unit):

- `100` = F$1.00
- `150000` = F$1,500.00
- `1000000` = F$10,000.00

This follows the same pattern as real-world currency APIs (e.g., Stripe) to avoid floating-point precision issues.

## API Endpoints

### Base URL

```
https://fauxbank.example.com/v1
```

### Authentication

Most endpoints require Bearer token authentication obtained through agent registration:

```
Authorization: Bearer {agent_token}
```

### Core Endpoints

#### 1. Agent Registration (No Auth Required)

Register a new agent to interact with fauxBank:

```http
POST /v1/agents/register
Content-Type: application/json

{
  "agent_id": "my-test-agent",
  "agent_type": "ECOMMERCE_MERCHANT",
  "capabilities_requested": ["MERCHANT_PROCESSING", "BALANCE_READ"]
}
```

**Agent Types:**
- `ECOMMERCE_MERCHANT`: Online store or marketplace
- `CUSTOMER_AGENT`: Simulated customer
- `PAYMENT_PROCESSOR`: Third-party payment handler
- `ANALYTICS`: Read-only data access

**Capabilities:**
- `MERCHANT_PROCESSING`: Accept card payments
- `BALANCE_READ`: Check account balances
- `TRANSFER`: Initiate transfers
- `ACCOUNT_CREATE`: Create new accounts
- `TRANSACTION_HISTORY`: View transaction logs

#### 2. Create Account

Create a new account for a customer:

```http
POST /v1/accounts
Authorization: Bearer {agent_token}
Content-Type: application/json

{
  "type": "CH",
  "segment": "RETL",
  "owner_id": "CUST-EXAMPLE",
  "name": "My Checking Account",
  "initial_deposit": {
    "value": 100000,
    "currency": "FXUSD"
  }
}
```

**Response:**
```json
{
  "account_id": "CH-RETL-NEWACCNT-AB",
  "type": "CH",
  "segment": "RETL",
  "owner_id": "CUST-EXAMPLE",
  "name": "My Checking Account",
  "balance": {
    "value": 100000,
    "currency": "FXUSD"
  },
  "status": "ACTIVE",
  "created_at": "2025-12-22T00:00:00Z"
}
```

#### 3. Get Account Balance

Retrieve current balance for an account:

```http
GET /v1/accounts/{accountId}/balance
Authorization: Bearer {agent_token}
```

**Response:**
```json
{
  "account_id": "CH-RETL-SOURCACC-XX",
  "balance": {
    "value": 250000,
    "currency": "FXUSD"
  },
  "available_balance": {
    "value": 250000,
    "currency": "FXUSD"
  },
  "as_of": "2025-12-22T00:00:00Z"
}
```

#### 4. Post Transaction

Execute a transfer between accounts:

```http
POST /v1/transactions
Authorization: Bearer {agent_token}
Content-Type: application/json

{
  "type": "TRANSFER",
  "amount": {
    "value": 10000,
    "currency": "FXUSD"
  },
  "debit_account": "CH-RETL-SOURCACC-XX",
  "credit_account": "CH-RETL-DESTACC-YY",
  "memo": "Payment for services"
}
```

**Transaction Types:**
- `TRANSFER`: Move funds between accounts
- `DEPOSIT`: Add funds to account
- `WITHDRAWAL`: Remove funds from account
- `PAYMENT`: Payment transaction
- `REFUND`: Return of payment

#### 5. Card Authorization (Merchant)

Process a card payment as a merchant:

```http
POST /v1/commercial/merchant/authorize
Authorization: Bearer {agent_token}
Content-Type: application/json

{
  "merchant_account": "MC-COMM-MYMERCH-XX",
  "card_token": "CARD-CH-RETL-CUSTOMER-XX",
  "amount": {
    "value": 5000,
    "currency": "FXUSD"
  },
  "order_reference": "ORDER-123"
}
```

**Response:**
```json
{
  "authorization_id": "AUTH-12345678",
  "status": "APPROVED",
  "amount": {
    "value": 5000,
    "currency": "FXUSD"
  },
  "merchant_account": "MC-COMM-MYMERCH-XX",
  "card_last_four": "STOM",
  "timestamp": "2025-12-22T00:00:00Z"
}
```

#### 6. Transaction History

Retrieve transaction history for an account:

```http
GET /v1/accounts/{accountId}/transactions?limit=50&offset=0
Authorization: Bearer {agent_token}
```

## Error Handling

### Error Code Categories

fauxBank uses structured error codes with the format `FB-XXXX`:

| Code    | Category    | Description                |
|---------|-------------|----------------------------|
| FB-1001 | AUTH        | Invalid credentials        |
| FB-1002 | AUTH        | Token expired              |
| FB-1003 | AUTH        | Insufficient permissions   |
| FB-2001 | ACCOUNT     | Account not found          |
| FB-2002 | ACCOUNT     | Account frozen             |
| FB-2003 | ACCOUNT     | Account closed             |
| FB-2004 | ACCOUNT     | Invalid account format     |
| FB-3001 | TRANSACTION | Insufficient funds         |
| FB-3002 | TRANSACTION | Limit exceeded             |
| FB-3003 | TRANSACTION | Duplicate transaction      |
| FB-5001 | RATE_LIMIT  | Too many requests          |

### Error Response Format

```json
{
  "error": {
    "code": "FB-3001",
    "message": "Insufficient funds",
    "details": {
      "account_id": "CH-RETL-SOURCACC-XX",
      "requested": 10000,
      "available": 5000
    }
  }
}
```

## Testing Features

fauxBank provides special testing endpoints to simulate various scenarios:

### 1. Failure Injection

Simulate network or processing failures:

```http
POST /v1/testing/network/inject-failure
Authorization: Bearer {agent_token}
Content-Type: application/json

{
  "network": "FAUXVISA",
  "failure_type": "DECLINED",
  "probability": 0.1,
  "duration_seconds": 3600
}
```

**Failure Types:**
- `DECLINED`: Card declined
- `TIMEOUT`: Network timeout
- `FRAUD_DETECTED`: Fraud alert
- `INSUFFICIENT_FUNDS`: NSF error

### 2. Time Advancement

Fast-forward time to test date-dependent features:

```http
POST /v1/testing/time/advance
Authorization: Bearer {agent_token}
Content-Type: application/json

{
  "advance_by": "P30D"
}
```

Uses ISO 8601 duration format:
- `P1D`: 1 day
- `P30D`: 30 days
- `P1M`: 1 month
- `P1Y`: 1 year

### 3. Environment Reset

Reset the testing environment to a clean state:

```http
POST /v1/testing/reset
Authorization: Bearer {agent_token}
Content-Type: application/json

{
  "preserve_agents": true,
  "seed_scenario": "RETAIL_DEMO"
}
```

**Seed Scenarios:**
- `RETAIL_DEMO`: Pre-populated with sample retail accounts
- `MERCHANT_DEMO`: Merchant-focused demo data
- `CLEAN`: Empty environment

## Double-Entry Ledger

fauxBank implements a complete double-entry accounting system:

- **Every transaction debits one account and credits another**
- **Ledger entries are immutable once posted**
- **Balance calculations derived from ledger history**
- **Audit trail for all financial activity**

### Ledger Entry Structure

```typescript
{
  entry_id: string;
  transaction_id: string;
  account_id: string;
  entry_type: "DEBIT" | "CREDIT";
  amount: {
    value: number;
    currency: "FXUSD";
  };
  balance_after: {
    value: number;
    currency: "FXUSD";
  };
  posted_at: string; // ISO 8601
  memo: string;
}
```

## Rate Limiting and Quotas

Agents are subject to rate limits based on their type and capabilities:

- **Default Rate Limit**: 100 requests per minute
- **Burst Allowance**: Up to 20 requests in 1 second
- **Daily Transaction Limit**: Based on agent type

Rate limit headers in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640995200
```

## Compliance and KYC Simulation

fauxBank simulates regulatory compliance workflows:

- **KYC (Know Your Customer)**: Identity verification simulation
- **AML (Anti-Money Laundering)**: Transaction monitoring
- **Dispute Resolution**: Chargeback and dispute workflows
- **Regulatory Reporting**: Mock compliance reports

## Integration with fauxCustomer

fauxCustomer agents interact with fauxBank through the standard API:

1. **Registration**: fauxCustomer agents register with fauxBank to obtain API tokens
2. **Account Creation**: Customers can open checking, savings, or credit accounts
3. **Transactions**: Customers can make payments, transfers, and purchases
4. **Balance Management**: Customers can check balances and transaction history
5. **Card Payments**: Customers use virtual cards linked to their accounts

### Typical Customer Flow

```
1. fauxCustomer agent registers with fauxBank
   → Receives agent token

2. Customer opens checking account
   → Receives account ID (e.g., CH-RETL-CUSTACCT-AB)

3. Customer receives initial deposit
   → Account balance updated

4. Customer makes purchase at fauxShop
   → Card authorization request to fauxBank
   → Funds transferred to merchant account

5. Customer checks transaction history
   → Retrieves ledger entries
```

## Security Model

### Agent-Based Access Control

- **No human users**: Only registered agents can interact
- **Capability-based permissions**: Agents request specific capabilities
- **Token-based authentication**: JWT tokens with expiration
- **Rate limiting**: Prevents abuse and DoS attacks

### Manipulation Resistance

- **Alpha-only account IDs**: Structurally impossible to confuse with real accounts
- **Immutable ledger**: Transaction history cannot be altered
- **Double-entry accounting**: Mathematical consistency enforced
- **Audit trail**: Complete history of all operations

## Development and Deployment

### Local Development

```bash
# Clone fauxBank repository
git clone https://github.com/CrazyDubya/fauxBank.git
cd fauxBank

# Install dependencies
npm install

# Set up local database
wrangler d1 create fauxbank-db --local
npm run db:migrate

# Start development server
npm run dev
```

### Testing

```bash
# Run unit tests
npm test

# Type checking
npm run typecheck
```

### Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Run production migrations
npm run db:migrate:prod
```

## Data Formats

### Money

```typescript
{
  value: number;      // In cents (e.g., 10000 = $100.00)
  currency: "FXUSD";  // Always FauxUSD
}
```

### Timestamps

All timestamps use ISO 8601 format:
```
2025-12-22T12:34:56Z
```

### Account Identifiers

Format: `XX-XXXX-XXXXXXXX-XX`
- Part 1: Account type (2 chars)
- Part 2: Segment (4 chars)
- Part 3: Unique identifier (8 chars)
- Part 4: Check digits (2 chars)

Example: `CH-RETL-MYCUSTOM-AB`

## Resources

- **Repository**: https://github.com/CrazyDubya/fauxBank
- **API Version**: v1
- **License**: MIT

## Related Projects

- **fauxCustomer**: Agentic customer simulator (this repository)
- **fauxShop**: E-commerce platform simulation (future)
- **fauxWeb**: Web ecosystem for agentic systems

---

*This documentation describes the fauxBank ecosystem as of December 2025. The API and features are subject to change as the platform evolves.*
