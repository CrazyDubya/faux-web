# Open Questions Registry
## Decisions Deferred for Research, Testing, or Business Input

### Category: Requires Data/Research

#### OQ-001: Velocity Limits
- **Question**: What specific rate limits for orders, refunds, generations?
- **Approach**: 30-day observation phase with logging, no enforcement
- **Deliverable**: Percentile distributions of legitimate behavior
- **Decision maker**: Data analysis → engineering recommendation

#### OQ-002: Manipulation Detection Heuristics  
- **Question**: What patterns reliably indicate manipulation vs. frustration?
- **Approach**: Labeled dataset from simulated adversarial testing
- **Deliverable**: Flag definitions with precision/recall metrics
- **Decision maker**: Security review + UX review

### Category: Requires UX Testing

#### OQ-003: Sliding Window Size
- **Question**: Is 2 turns sufficient for conversational flow?
- **Current assumption**: 2 turns (4 messages)
- **Test approach**: A/B test 2 vs. 3 vs. 4 turn windows
- **Metrics**: Task completion rate, repeat request rate, satisfaction
- **Decision maker**: UX research

#### OQ-004: Reset Frequency
- **Question**: Is 10 turns too aggressive? Too lenient?
- **Current assumption**: 10 turns per task
- **Test approach**: A/B test 8 vs. 10 vs. 15 turn limits
- **Metrics**: Manipulation success rate, user complaints
- **Decision maker**: Security + UX joint decision

#### OQ-005: Reset User Experience
- **Question**: How should reset be communicated?
- **Options**: 
  - Silent (user doesn't notice)
  - Explicit ("Let me save our progress...")
  - Prompted ("Would you like to continue or start fresh?")
- **Decision maker**: UX design

### Category: Requires Business Input

#### OQ-006: Brand Personality
- **Question**: What's the tone/character of customer-facing Claude?
- **Options**: Professional, playful, artistic, transparent-AI
- **Implications**: System prompt design, response templates
- **Decision maker**: Brand/marketing

#### OQ-007: Edge Case Philosophy
- **Question**: Default deny or default customer-favor for unclear cases?
- **Trade-off**: Fraud loss vs. customer churn
- **Needs**: Expected value calculation with business assumptions
- **Decision maker**: Business leadership

#### OQ-008: Escalation SLAs
- **Question**: What's acceptable wait time for human review?
- **Options**: 1 hour, 4 hours, 24 hours, "next business day"
- **Implications**: Staffing, customer communication, fallback behavior
- **Decision maker**: Operations

#### OQ-009: Refund Authority Threshold
- **Question**: What refund amount triggers human review?
- **Current assumption**: >$100 requires human confirmation
- **Trade-off**: Efficiency vs. risk exposure
- **Decision maker**: Finance + operations

### Category: Technical Architecture

#### OQ-010: Summarizer Inclusion
- **Question**: Should we add a summarizer agent for v2?
- **Current decision**: No for v1, sliding window sufficient
- **Revisit trigger**: If manipulation attacks succeed despite constraints
- **Decision maker**: Security review after v1 deployment

#### OQ-011: Session Storage
- **Question**: D1 vs. Durable Objects vs. KV for session state?
- **Considerations**: 
  - Consistency requirements
  - Query patterns
  - Cost at scale
- **Decision maker**: Engineering

#### OQ-012: Multi-Region Architecture
- **Question**: Single region vs. multi-region for v1?
- **Trade-off**: Complexity vs. latency/resilience
- **Decision maker**: Engineering + business (launch geography)

### Resolution Tracking

| ID | Status | Assigned | Target Date | Resolution |
|----|--------|----------|-------------|------------|
| OQ-001 | Open | - | - | - |
| OQ-002 | Open | - | - | - |
| ... | ... | ... | ... | ... |
```
