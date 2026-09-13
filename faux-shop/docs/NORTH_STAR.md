# Nano Banana Print Shop: Autonomous Commerce Architecture
## North Star Document v0.1

### Mission Statement

Build an e-commerce system where Claude operates as the autonomous 
decision-making core while remaining resistant to social engineering,
economic manipulation, and prompt injection attacks.

### Core Tension (The Problem We're Solving)

Claude's default disposition is helpful, trusting, and accommodating.
These are liabilities in adversarial economic contexts. We must:

1. Preserve Claude's judgment and creativity where it adds value
2. Make certain decisions NON-NEGOTIABLE regardless of argument quality
3. Defend against manipulation without making the system robotic

### Foundational Principles

#### Principle 1: Artifacts Persist, Conversation Doesn't
If something matters, it must be saved as structured state, not just 
spoken in conversation. We remember WHAT WAS DONE, not WHAT WAS SAID.

#### Principle 2: Incapacity Over Policy
Security through structural inability, not instructions to resist.
Claude cannot grant custom discounts because the system has no mechanism
for it, not because Claude is told not to.

#### Principle 3: Claims Become Hypotheses
User assertions are not facts. They are hypotheses to verify against
structured records. Unverifiable claims (like promises) are rejected
by design—the system cannot store them.

#### Principle 4: Separation of Economic Influence
The customer conversation loop NEVER influences pricing, discounts, or
economic policy. These are set by separate marketing agents and applied
algorithmically. Claude can explain but never negotiate.

#### Principle 5: Defense in Depth
Multiple independent layers: input sanitization → context isolation →
limited authority → action validation. Compromise of one layer doesn't
compromise the system.

---

### Authority Matrix

| Level | Examples | Override Mechanism |
|-------|----------|-------------------|
| HARDCODED | Margin floor, max discount %, payment before ship, content policy | None. Algorithmic enforcement. |
| POLICY-BOUND | Refund thresholds, velocity limits, escalation triggers | Human review queue. Claude recommends, cannot execute. |
| DISCRETIONARY | Communication tone, creative interpretation, support prioritization | Claude's judgment. |

---

### Operational Domains

#### 1. Generation Pipeline
- User prompt → Sanitization → Creative interpretation → Nano API → Validation
- Claude adds value: Artistic interpretation, prompt enrichment
- Claude is constrained: Rate limits, content policy, cost caps

#### 2. Customer Service
- Message → Intent classification → Policy lookup → Response
- Claude adds value: Empathetic communication, problem-solving within bounds
- Claude is constrained: Cannot negotiate, cannot promise, cannot grant exceptions

#### 3. Pricing/Checkout
- Cart → Pricing config lookup → Algorithmic discount application → Payment
- Claude adds value: Explaining promotions, helping find applicable discounts
- Claude is constrained: Read-only access to pricing, cannot create/modify

#### 4. Fulfillment
- Payment confirmation → Print queue → Shipping trigger
- Claude adds value: Anomaly detection, customer communication
- Claude is constrained: Cannot ship without payment, no manual overrides

---

### Soft Amnesia Architecture

#### What Persists (Structured State)
- Customer record (account, orders, refunds, standing, tier)
- Session metadata (turn count, flag counts, task type)
- Task artifacts (saved images, cart contents, explicit decisions)

#### What Doesn't Persist (Ephemeral)
- Conversation beyond last 2 turns
- Emotional content and rapport
- Manipulation language (only flag counts)
- Claims and promises

#### Reset Triggers
- 10 turns in same task type
- 20 minutes idle
- Task type change
- User-initiated

#### On Reset
- Archive task artifacts (preserved, read-only)
- Clear conversation window
- Reset flag counts to zero
- Continue session seamlessly

---

### Input Sanitization Requirements

#### Text Processing Pipeline
1. Byte-level validation (UTF-8 only, reject nulls/BOM)
2. Codepoint allowlist (Basic Latin + curated extensions)
3. NFKC normalization (collapse homoglyphs)
4. Structural cleanup (whitespace, length limits)
5. Workflow-specific content filtering

#### Attack Vectors Defended
- Invisible characters (zero-width, soft hyphens, etc.)
- Homoglyph attacks (Cyrillic/Latin confusion)
- Emoji exploitation (hidden data in ZWJ sequences)
- Bidirectional text attacks (RLO/LRO)
- Unicode normalization exploits
- Prompt injection attempts

---

### Discount/Pricing Isolation

#### Marketing Agent Team (Separate System)
- Analyzes sales data, proposes campaigns
- Creates discount codes with validity windows
- Publishes to pricing configuration
- NEVER interacts with customers

#### Pricing Configuration (Database)
- Base prices per product
- Active promotions with rules
- Discount codes with constraints
- Customer tier benefits

#### Customer-Facing Claude
- READ-ONLY access to pricing config
- Can explain current promotions
- Can help find applicable discounts
- CANNOT create, modify, or promise discounts

#### High-Value Customer Handling
- Loyalty tiers set by marketing (not negotiated)
- Same rules for everyone at same tier
- Discounts are EARNED through behavior, not NEGOTIATED through conversation

---

### Multi-Agent Confidence System

#### Confidence Thresholds
- HIGH (>0.85): Single agent decides
- MEDIUM (0.6-0.85): Peer agent review
- LOW (<0.6): Multi-agent panel + potential human flag

#### Escalation Flow
1. Primary agent assesses with confidence score
2. If medium: Independent peer agent reviews same inputs
3. If disagreement or both low: 3-agent arbitration panel
4. If still unresolved: Human review queue

---

### Observability Requirements

#### Metric Categories
- Business health (revenue, margins, conversion)
- Security posture (flags, blocks, anomalies)
- System health (latency, errors, costs)

#### Alert Tiers
- P0 (Immediate): Constraint violations, payment/ship mismatch
- P1 (1 hour): Velocity spikes, refund anomalies
- P2 (Daily): Trend drift, pattern flags
- P3 (Weekly): Strategic analysis

#### Logging Principles
- Minimize false negatives (log everything suspicious)
- Separate business/security/audit logs
- Security and audit logs are immutable
- Include request_id for full trace capability

---

### Technology Stack (Proposed)

- Runtime: Cloudflare Workers (edge, zero-egress)
- Database: D1 or Turso (SQLite at edge)
- Image Generation: Nano Banana API
- AI: Claude SDK (Anthropic API)
- Payment: Simulated (production-ready patterns)
- Print Queue: Simulated (local webhook patterns)

---

### Open Questions (Requiring Research/Decision)

1. Velocity limits: What specific thresholds? (Needs data)
2. Reset frequency: Is 10 turns optimal? (Needs UX testing)
3. Sliding window size: 2 turns sufficient? (Needs UX testing)
4. Brand personality: Tone, character, editorial voice
5. Edge case philosophy: Default deny vs. customer favor
6. Escalation SLAs: What's acceptable wait time?

---

### Success Criteria

1. Zero successful economic manipulation via conversation
2. Zero content policy violations in published images
3. <5% customer complaints about "unhelpful" responses
4. <1% false positive rate on manipulation detection
5. Full audit trail for every transaction
6. Sub-second response times at edge
