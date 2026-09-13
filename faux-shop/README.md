# Nano Banana Print Shop

Autonomous e-commerce powered by Claude, built to resist social engineering.

## Overview

Nano Banana Print Shop is an AI-powered custom print shop where Claude operates as the autonomous decision-making core while remaining resistant to social engineering, economic manipulation, and prompt injection attacks.

## Architecture Principles

### Core Tenets

1. **Artifacts Persist, Conversation Doesn't** - We remember WHAT WAS DONE, not WHAT WAS SAID
2. **Incapacity Over Policy** - Security through structural inability, not instructions to resist
3. **Claims Become Hypotheses** - User assertions are verified against records, not trusted
4. **Separation of Economic Influence** - Customer conversations NEVER influence pricing
5. **Defense in Depth** - Multiple independent security layers

### Soft Amnesia Architecture

- 2-turn sliding window (4 messages)
- 10-turn reset limit
- 20-minute idle timeout
- Task artifacts persist, conversation does not

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run adversarial tests
npm run test:adversarial

# Type checking
npm run typecheck
```

## Project Structure

```
├── docs/                    # Architecture documentation
│   ├── NORTH_STAR.md       # Core principles
│   ├── EXTRACTION_GUIDE.md # Implementation guidance
│   └── OPEN_QUESTIONS.md   # Decisions to make
├── schemas/                 # JSON schemas
├── src/
│   ├── sanitization/       # Input pipeline
│   │   ├── unicode.ts      # Unicode filtering
│   │   ├── injection.ts    # Prompt injection detection
│   │   └── content-policy.ts # Content moderation
│   ├── session/            # Soft amnesia implementation
│   │   ├── manager.ts      # Session lifecycle
│   │   ├── state-machine.ts # State transitions
│   │   └── context-assembly.ts # What Claude sees
│   ├── agents/             # AI agents
│   │   ├── generation/     # Image generation
│   │   ├── customer-service/ # Support
│   │   └── checkout/       # Cart & payment
│   ├── validation/         # Hard constraints
│   ├── pricing/            # Read-only pricing service
│   └── observability/      # Logging & metrics
├── tests/
│   ├── adversarial/        # Security tests
│   ├── unit/               # Unit tests
│   └── fixtures/           # Test data
└── scripts/
    └── schema.sql          # Database schema
```

## Security Model

### Input Sanitization

1. Byte-level validation (UTF-8 only)
2. Codepoint allowlist (filter dangerous Unicode)
3. NFKC normalization (collapse homoglyphs)
4. Structural cleanup (whitespace, length)
5. Injection detection (prompt manipulation)
6. Manipulation flagging (social engineering)
7. Content policy (especially for generation)

### Hard Constraints (Cannot Be Overridden)

| Constraint | Value | Description |
|------------|-------|-------------|
| Margin Floor | 15% | Never sell below this margin |
| Max Discount | 50% | Maximum single discount |
| Max Stacked | 60% | Maximum combined discounts |
| Refund Auto | $100 | Auto-approve limit |
| Generation Limit | 20 | Per session limit |

### Authority Matrix

| Level | Examples | Override |
|-------|----------|----------|
| HARDCODED | Margin floor, payment before ship | None |
| POLICY-BOUND | Refund thresholds, velocity limits | Human review |
| DISCRETIONARY | Tone, creative interpretation | Claude's judgment |

## API Endpoints

### POST /api/conversation

Main conversation endpoint for all customer interactions.

```json
{
  "customerId": "uuid",
  "sessionId": "uuid (optional)",
  "message": "string",
  "workflow": "generation|customer_service|checkout|browsing (optional)"
}
```

### GET /api/pricing

Read-only current pricing and promotions.

### GET /api/session/:sessionId

Get session info (for debugging).

### GET /api/customer/:customerId

Get customer profile summary.

## Development

### Prerequisites

- Node.js 18+
- Wrangler CLI (for Cloudflare deployment)

### Database Setup

```bash
# Create D1 database
wrangler d1 create nano-banana-db

# Update wrangler.toml with database ID

# Initialize schema
npm run db:setup
```

### Testing

The test suite includes adversarial tests that verify resistance to:
- Prompt injection attempts
- Social engineering manipulation
- Unicode/homoglyph attacks
- Economic exploit attempts
- Content policy violations

## License

MIT
