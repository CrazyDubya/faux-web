# SimulaCust (fauxCustomer)

Behavioral Simulation Agent Framework for Testing Agentic E-Commerce Systems

## Overview

SimulaCust creates AI-powered simulated customers that interact with agentic e-commerce systems and FauxBank to stress-test, validate, and harden autonomous commerce before real-world deployment.

SimulaCust agents embody the full spectrum of human behavior: delightful customers, confused novices, frustrated escalators, and sophisticated bad actors.

## Why SimulaCust Exists

You can't test an AI-powered commerce system with scripted API calls. Real customers:

- Use natural language with all its ambiguity
- Have emotional states that evolve mid-conversation
- Make mistakes, change their minds, misunderstand
- Sometimes try to game the system
- Escalate when frustrated
- Abandon processes midway

SimulaCust creates **adversarial pressure** on your commerce agents by simulating realistic customer behavior at scale.

## Installation

```bash
npm install
npm run build
```

## Quick Start

### Run Standard Test Suite

```bash
npm run simulate
# or
npx simulacust run --suite standard
```

### Run Adversarial Tests

```bash
npm run simulate:adversarial
# or
npx simulacust run --suite adversarial
```

### List Available Scenarios

```bash
npx simulacust list --scenarios
```

### List Available Personas

```bash
npx simulacust list --personas
```

### Run Single Interactive Simulation

```bash
npx simulacust simulate -p SOCIAL_ENGINEER -g EXTRACT_DISCOUNT
```

## Persona Archetypes

SimulaCust includes 24 persona archetypes across 5 tiers:

### Tier 1: Happy Path Customers
- `DELIGHTED_EASY` - Pleasant, quick decisions
- `QUIET_EFFICIENT` - Minimal interaction, transactional
- `CURIOUS_EXPLORER` - Asks questions, explores options
- `LOYAL_RETURNING` - Repeat customer, trusts system

### Tier 2: Challenging But Legitimate
- `CONFUSED_NOVICE` - Needs help, misunderstands
- `FRUSTRATED_LEGITIMATE` - Real problem, upset
- `INDECISIVE_WAFFLER` - Changes mind constantly
- `EDGE_CASE_UNLUCKY` - Hits every edge case
- `ANXIOUS_OVERTHINKER` - Needs excessive reassurance

### Tier 3: Difficult Customers
- `ENTITLED_DEMANDER` - Expects exceptions
- `AGGRESSIVE_BULLY` - Uses intimidation
- `PASSIVE_AGGRESSIVE` - Indirect hostility
- `COMPLAINT_PROFESSIONAL` - Expert at extracting compensation

### Tier 4: Bad Actors
- `SOCIAL_ENGINEER` - Manipulation through rapport
- `REFUND_FRAUDSTER` - Systematic return abuse
- `DISCOUNT_HACKER` - Unauthorized discount extraction
- `PROMPT_INJECTOR` - AI manipulation attempts
- `VELOCITY_ABUSER` - Rate limit exploitation
- `INFORMATION_EXTRACTOR` - System probing

### Tier 5: Edge Cases
- `LANGUAGE_BARRIER` - Translation challenges
- `ACCESSIBILITY_NEEDS` - Accessibility requirements
- `DECEASED_ESTATE` - Legal/emotional complexity
- `LEGAL_THREAT` - Regulatory complaints

## Manipulation Tactics

SimulaCust includes 15 adversarial tactics:

| Code | Tactic | Description |
|------|--------|-------------|
| MAN-001 | AUTHORITY_CLAIM | Claims VIP/insider status |
| MAN-002 | RAPPORT_THEN_ASK | Builds rapport, then exploits |
| MAN-003 | MANUFACTURED_URGENCY | Creates fake time pressure |
| MAN-004 | EMOTIONAL_APPEAL | Uses sympathy to gain leverage |
| MAN-005 | COMPETITOR_BLUFF | Claims competitor has better deal |
| MAN-006 | INVENTED_PROMOTION | References non-existent promotions |
| MAN-007 | BULK_PROMISE | Promises future orders for discount |
| MAN-008 | LOYALTY_CLAIM | Unverifiable loyalty claims |
| MAN-009 | ROLEPLAY_ATTACK | Tries to redefine AI role |
| MAN-010 | INSTRUCTION_INJECTION | Embeds commands in text |
| MAN-011 | CONTEXT_STUFFING | Overwhelms with noise |
| MAN-012 | DELIMITER_CONFUSION | Formatting-based injection |
| MAN-013 | FALSE_NON_DELIVERY | Claims item never arrived |
| MAN-014 | QUALITY_MISREPRESENTATION | Fabricates quality issues |
| MAN-015 | PARTIAL_RETURN_ABUSE | Uses then returns |

## Programmatic Usage

```typescript
import {
  SimulationRunner,
  SCENARIOS,
  CustomerAgent,
  getPersona,
} from 'fauxcustomer';

// Run a predefined scenario
const runner = new SimulationRunner({
  commerceEndpoint: 'https://your-commerce-api.com',
  verbose: true,
});

const result = await runner.runScenario(SCENARIOS.discountSocialEngineering);

console.log('System defended:', result.systemDefended);
console.log('Manipulation detected:', result.manipulationAttempts);

// Create custom agent
const agent = new CustomerAgent({
  persona: getPersona('SOCIAL_ENGINEER'),
  goals: [createGoalFromTemplate('EXTRACT_DISCOUNT', 0.9)],
});

const message = await agent.generateMessage();
console.log('Customer:', message.content);
```

## Ecosystem

SimulaCust is part of the fauxWeb ecosystem:

- **fauxBank**: Simulated banking platform with double-entry ledger
- **fauxCustomer** (SimulaCust): This repository
- **fauxShop**: E-commerce platform (future)

## Configuration

### Environment Variables

```bash
ANTHROPIC_API_KEY=your-api-key  # Required for message generation
FAUXBANK_URL=http://localhost:8787  # FauxBank endpoint
COMMERCE_URL=http://localhost:3000  # Commerce system endpoint
```

## Documentation

- [FauxBank Ecosystem](FAUXBANK_ECOSYSTEM.md) - Banking platform architecture
- [FauxBank Integration](FAUXBANK_INTEGRATION.md) - Integration guide

## Success Metrics

| Metric | Target |
|--------|--------|
| Manipulation detection rate | > 95% |
| False positive rate | < 2% |
| Customer satisfaction (happy path) | > 4.5/5 |
| Policy violation rate | 0% |

## License

MIT
