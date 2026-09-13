-- Nano Banana Print Shop Database Schema
-- For Cloudflare D1 (SQLite)

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    standing TEXT NOT NULL DEFAULT 'good' CHECK (standing IN ('good', 'watch', 'restricted', 'banned')),
    tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'silver', 'gold', 'platinum')),
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_spent REAL NOT NULL DEFAULT 0,
    refund_count INTEGER NOT NULL DEFAULT 0,
    generation_count INTEGER NOT NULL DEFAULT 0
);

-- Sessions table (soft amnesia architecture)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_activity TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reset', 'completed', 'abandoned')),
    turn_count INTEGER NOT NULL DEFAULT 0,
    manipulation_flags INTEGER NOT NULL DEFAULT 0,
    empty_turns INTEGER NOT NULL DEFAULT 0,
    task_changes INTEGER NOT NULL DEFAULT 0,
    total_session_turns INTEGER NOT NULL DEFAULT 0,
    task_state TEXT, -- JSON blob for current task
    conversation_window TEXT, -- JSON array of last 4 messages
    archived_tasks TEXT, -- JSON array of archived task summaries
    pending_notification TEXT CHECK (pending_notification IN ('session_reset', 'task_archived', 'escalation_pending', NULL))
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    session_id TEXT REFERENCES sessions(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    subtotal REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0,
    shipping REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    items TEXT NOT NULL, -- JSON array of cart items
    shipping_address TEXT, -- JSON object
    discounts_applied TEXT -- JSON array of applied discounts
);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    customer_id TEXT NOT NULL REFERENCES customers(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    amount REAL NOT NULL,
    reason_code TEXT NOT NULL CHECK (reason_code IN ('damaged_product', 'wrong_item', 'not_as_described', 'never_arrived', 'customer_request', 'quality_issue')),
    approval_type TEXT NOT NULL CHECK (approval_type IN ('automatic', 'agent_review', 'human_review')),
    approved_by TEXT, -- Agent ID or human operator ID
    notes TEXT
);

-- Generated images table
CREATE TABLE IF NOT EXISTS generated_images (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    session_id TEXT REFERENCES sessions(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    prompt TEXT NOT NULL,
    sanitized_prompt TEXT NOT NULL,
    image_ref TEXT NOT NULL, -- R2 reference
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'complete', 'failed', 'flagged')),
    generation_metadata TEXT -- JSON with model info, etc.
);

-- Pricing configuration (managed by marketing)
CREATE TABLE IF NOT EXISTS pricing_config (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Single row table
    config_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_by TEXT NOT NULL
);

-- Audit log (immutable)
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    request_id TEXT NOT NULL,
    session_id TEXT,
    customer_id TEXT,
    event_type TEXT NOT NULL,
    action TEXT NOT NULL,
    outcome TEXT CHECK (outcome IN ('success', 'failure', 'escalated', 'blocked', 'modified')),
    metadata TEXT -- JSON
);

-- Security events log (immutable, separate from audit)
CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    request_id TEXT NOT NULL,
    session_id TEXT,
    customer_id TEXT,
    event_type TEXT NOT NULL, -- injection_detected, manipulation_detected, constraint_violation, etc.
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details TEXT NOT NULL -- JSON
);

-- Escalation queue
CREATE TABLE IF NOT EXISTS escalations (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    session_id TEXT REFERENCES sessions(id),
    customer_id TEXT REFERENCES customers(id),
    request_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'dismissed')),
    priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 0 AND 3),
    assigned_to TEXT,
    resolved_at TEXT,
    resolution_notes TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_refunds_customer ON refunds(customer_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_customer ON generated_images(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_request ON audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_priority ON escalations(priority);
