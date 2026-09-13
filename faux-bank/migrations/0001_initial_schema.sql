-- FauxBank Initial Schema
-- Immutable ledger with double-entry accounting

-- Customers/Owners table
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('INDIVIDUAL', 'BUSINESS', 'AGENT', 'SYSTEM')),
    name TEXT NOT NULL,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
    kyc_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (kyc_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')),
    kyc_verified_at TEXT,
    metadata TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Accounts table
CREATE TABLE accounts (
    id TEXT PRIMARY KEY CHECK (id GLOB '[A-Z][A-Z]-[A-Z][A-Z][A-Z][A-Z]-[A-Z][A-Z][A-Z][A-Z][A-Z][A-Z][A-Z][A-Z]-[A-Z][A-Z]'),
    type TEXT NOT NULL CHECK (type IN ('CH', 'SV', 'MM', 'CD', 'LN', 'MG', 'CC', 'LC', 'MC', 'TR', 'ES', 'OP')),
    segment TEXT NOT NULL CHECK (segment IN ('RETL', 'COMM', 'GOVT')),
    owner_id TEXT NOT NULL REFERENCES customers(id),
    name TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED', 'PENDING')),
    currency TEXT NOT NULL DEFAULT 'FXUSD',

    -- Balances (in smallest currency unit - cents)
    balance_available INTEGER NOT NULL DEFAULT 0,
    balance_ledger INTEGER NOT NULL DEFAULT 0,
    balance_pending INTEGER NOT NULL DEFAULT 0,
    balance_held INTEGER NOT NULL DEFAULT 0,

    -- Product configuration
    overdraft_limit INTEGER NOT NULL DEFAULT 0,
    daily_withdrawal_limit INTEGER NOT NULL DEFAULT 50000,
    daily_transfer_limit INTEGER NOT NULL DEFAULT 1000000,

    -- Interest/Fee configuration
    interest_rate_bps INTEGER NOT NULL DEFAULT 0, -- Basis points
    monthly_fee INTEGER NOT NULL DEFAULT 0,

    metadata TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    closed_at TEXT
);

CREATE INDEX idx_accounts_owner ON accounts(owner_id);
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_status ON accounts(status);

-- Transactions table (immutable, append-only)
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN (
        'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PAYMENT', 'FEE',
        'INTEREST', 'ADJUSTMENT', 'AUTHORIZATION', 'CAPTURE',
        'REFUND', 'CHARGEBACK', 'REVERSAL'
    )),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'POSTED', 'FAILED', 'REVERSED')),

    -- Double-entry: every transaction debits one account and credits another
    debit_account_id TEXT NOT NULL,
    credit_account_id TEXT NOT NULL,

    -- Amount
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'FXUSD',

    -- References
    reference TEXT,
    memo TEXT,
    idempotency_key TEXT UNIQUE,

    -- Linked transactions (for reversals, captures, etc.)
    parent_transaction_id TEXT REFERENCES transactions(id),

    -- Audit trail
    agent_id TEXT,
    session_id TEXT,

    metadata TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    posted_at TEXT,

    -- Risk scoring
    risk_score REAL DEFAULT 0.0
);

CREATE INDEX idx_transactions_debit ON transactions(debit_account_id);
CREATE INDEX idx_transactions_credit ON transactions(credit_account_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_idempotency ON transactions(idempotency_key);

-- Authorizations table (for card holds)
CREATE TABLE authorizations (
    id TEXT PRIMARY KEY,
    merchant_account_id TEXT NOT NULL REFERENCES accounts(id),
    card_token TEXT NOT NULL,
    customer_account_id TEXT NOT NULL REFERENCES accounts(id),

    amount INTEGER NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'FXUSD',

    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'CAPTURED', 'VOIDED', 'EXPIRED')),
    decline_reason TEXT,

    order_reference TEXT,
    capture_mode TEXT NOT NULL DEFAULT 'MANUAL' CHECK (capture_mode IN ('MANUAL', 'AUTOMATIC')),

    -- Track captured amount (for partial captures)
    amount_captured INTEGER NOT NULL DEFAULT 0,

    metadata TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    captured_at TEXT,

    -- Linked transaction when captured
    transaction_id TEXT REFERENCES transactions(id)
);

CREATE INDEX idx_authorizations_merchant ON authorizations(merchant_account_id);
CREATE INDEX idx_authorizations_customer ON authorizations(customer_account_id);
CREATE INDEX idx_authorizations_status ON authorizations(status);
CREATE INDEX idx_authorizations_expires ON authorizations(expires_at);

-- Agents table
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN (
        'ECOMMERCE_MERCHANT', 'CUSTOMER_SERVICE', 'TREASURY_MANAGEMENT',
        'ANALYTICS', 'COMPLIANCE', 'ADMIN'
    )),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),

    -- Authentication
    token_hash TEXT NOT NULL,

    -- Capabilities (JSON array)
    capabilities TEXT NOT NULL,

    -- Scoping
    account_patterns TEXT, -- JSON array of glob patterns
    transaction_types TEXT, -- JSON array of allowed types

    -- Rate limits
    requests_per_minute INTEGER NOT NULL DEFAULT 100,
    transactions_per_minute INTEGER NOT NULL DEFAULT 50,
    daily_amount_limit INTEGER NOT NULL DEFAULT 100000000, -- F$1M default

    -- Single transaction limits
    single_transaction_limit INTEGER NOT NULL DEFAULT 10000000, -- F$100k default

    -- Webhook
    webhook_url TEXT,

    metadata TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT,
    last_active_at TEXT
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_type ON agents(type);

-- Agent rate limit tracking
CREATE TABLE agent_rate_limits (
    agent_id TEXT NOT NULL REFERENCES agents(id),
    window_start TEXT NOT NULL,
    window_type TEXT NOT NULL CHECK (window_type IN ('MINUTE', 'HOUR', 'DAY')),
    request_count INTEGER NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    amount_total INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (agent_id, window_start, window_type)
);

-- Disputes table
CREATE TABLE disputes (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    customer_id TEXT NOT NULL REFERENCES customers(id),

    reason TEXT NOT NULL CHECK (reason IN (
        'UNAUTHORIZED', 'DUPLICATE', 'WRONG_AMOUNT',
        'NOT_RECEIVED', 'NOT_AS_DESCRIBED', 'FRAUD',
        'CANCELED'
    )),
    description TEXT,

    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN (
        'OPEN', 'EVIDENCE_NEEDED', 'UNDER_REVIEW',
        'RESOLVED_CUSTOMER', 'RESOLVED_MERCHANT', 'ESCALATED'
    )),

    -- Provisional credit
    provisional_credit_amount INTEGER,
    provisional_credit_transaction_id TEXT REFERENCES transactions(id),

    -- Resolution
    resolution TEXT,
    resolved_at TEXT,

    -- Deadlines
    respond_by TEXT NOT NULL,

    metadata TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_disputes_transaction ON disputes(transaction_id);
CREATE INDEX idx_disputes_customer ON disputes(customer_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- KYC Verifications table
CREATE TABLE kyc_verifications (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),

    verification_type TEXT NOT NULL CHECK (verification_type IN (
        'IDENTITY', 'ADDRESS', 'INCOME', 'BUSINESS'
    )),

    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'APPROVED', 'REJECTED', 'MORE_INFO_NEEDED', 'EXPIRED'
    )),

    -- Documents (JSON array)
    documents TEXT,

    -- Review
    reviewed_by TEXT,
    review_notes TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT
);

CREATE INDEX idx_kyc_customer ON kyc_verifications(customer_id);
CREATE INDEX idx_kyc_status ON kyc_verifications(status);

-- Audit log table
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    log_type TEXT NOT NULL,

    -- Context
    agent_id TEXT,
    session_id TEXT,
    customer_id TEXT,
    account_id TEXT,

    -- Action details
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,

    -- Request/Response (sanitized)
    request TEXT, -- JSON
    response TEXT, -- JSON

    outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE', 'BLOCKED')),
    error_code TEXT,

    -- Security flags
    risk_score REAL DEFAULT 0.0,
    flags TEXT, -- JSON array
    manipulation_detected INTEGER DEFAULT 0,

    latency_ms INTEGER,
    trace_id TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_agent ON audit_logs(agent_id);
CREATE INDEX idx_audit_customer ON audit_logs(customer_id);
CREATE INDEX idx_audit_account ON audit_logs(account_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_outcome ON audit_logs(outcome);

-- System configuration table (for treasury-managed settings)
CREATE TABLE system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    value_type TEXT NOT NULL CHECK (value_type IN ('STRING', 'INTEGER', 'FLOAT', 'JSON', 'BOOLEAN')),
    category TEXT NOT NULL,
    description TEXT,
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default configuration
INSERT INTO system_config (key, value, value_type, category, description) VALUES
    ('fed_funds_target', '525', 'INTEGER', 'INTEREST_RATES', 'Federal funds target rate in basis points'),
    ('savings_apy', '450', 'INTEGER', 'INTEREST_RATES', 'Savings APY in basis points'),
    ('cd_12_month_apy', '500', 'INTEGER', 'INTEREST_RATES', '12-month CD APY in basis points'),
    ('prime_rate', '850', 'INTEGER', 'INTEREST_RATES', 'Prime rate in basis points'),
    ('monthly_maintenance_fee', '1200', 'INTEGER', 'FEES', 'Monthly maintenance fee in cents'),
    ('overdraft_fee', '3500', 'INTEGER', 'FEES', 'Overdraft fee in cents'),
    ('wire_domestic_fee', '2500', 'INTEGER', 'FEES', 'Domestic wire fee in cents'),
    ('wire_international_fee', '4500', 'INTEGER', 'FEES', 'International wire fee in cents'),
    ('daily_atm_limit', '50000', 'INTEGER', 'LIMITS', 'Daily ATM withdrawal limit in cents'),
    ('daily_debit_limit', '500000', 'INTEGER', 'LIMITS', 'Daily debit purchase limit in cents'),
    ('daily_external_transfer_limit', '1000000', 'INTEGER', 'LIMITS', 'Daily external transfer limit in cents');

-- Create system accounts for double-entry bookkeeping
INSERT INTO customers (id, type, name, status, kyc_status) VALUES
    ('SYSTEM', 'SYSTEM', 'FauxBank System', 'ACTIVE', 'VERIFIED'),
    ('EXTERNAL', 'SYSTEM', 'External Entities', 'ACTIVE', 'VERIFIED');

-- Seed central bank account (F$1B initial liquidity)
INSERT INTO accounts (id, type, segment, owner_id, name, balance_available, balance_ledger, status) VALUES
    ('CH-COMM-SEEDBANK-AA', 'OP', 'COMM', 'SYSTEM', 'Central Liquidity Pool', 100000000000, 100000000000, 'ACTIVE'),
    ('CH-COMM-FEEINCOM-BB', 'OP', 'COMM', 'SYSTEM', 'Fee Income Account', 0, 0, 'ACTIVE'),
    ('CH-COMM-INTEREST-CC', 'OP', 'COMM', 'SYSTEM', 'Interest Expense Account', 0, 0, 'ACTIVE'),
    ('CH-COMM-EXTERNAL-DD', 'OP', 'COMM', 'EXTERNAL', 'External Settlement Account', 0, 0, 'ACTIVE');

-- Failure injection configuration (for testing)
CREATE TABLE failure_injections (
    id TEXT PRIMARY KEY,
    network TEXT NOT NULL CHECK (network IN ('FAUXVISA', 'FAUXMASTER', 'FAUXACH', 'FAUXWIRE')),
    failure_type TEXT NOT NULL CHECK (failure_type IN ('DECLINED', 'TIMEOUT', 'NETWORK_ERROR', 'DUPLICATE_DETECTED')),
    probability REAL NOT NULL DEFAULT 0.1,
    active INTEGER NOT NULL DEFAULT 1,

    -- Filters (JSON)
    filters TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);

CREATE INDEX idx_failure_network ON failure_injections(network);
CREATE INDEX idx_failure_active ON failure_injections(active);

-- Simulated time tracking (for time advancement in testing)
CREATE TABLE simulated_time (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_time TEXT NOT NULL DEFAULT (datetime('now')),
    time_offset_seconds INTEGER NOT NULL DEFAULT 0
);

INSERT INTO simulated_time (id, current_time, time_offset_seconds) VALUES (1, datetime('now'), 0);
