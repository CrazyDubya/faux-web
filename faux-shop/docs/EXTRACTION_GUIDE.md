# Conversation Extraction Guide
## For Agentic Processing of Design Conversation

### Document Purpose

This guide helps an AI agent extract actionable architecture from the 
preceding design conversation. The conversation was exploratory—multiple
paths were considered and some were abandoned. This guide maps what to
extract and what to skip.

### Conversation Structure

The conversation follows this arc:

1. **Initial Problem Framing** (Human message 1, Claude response 1)
   - Establishes the core challenge: Claude as autonomous economic agent
   - Introduces the "helpful Claude is a liability" tension
   - Lists operational domains and initial threat model
   - STATUS: Foundational. Extract domain decomposition and authority matrix.

2. **Architecture Refinement** (Human message 2, Claude response 2)
   - Human makes key decisions:
     - Owner never uses customer interface
     - Discounts isolated from conversation
     - Claude should know about constraints
     - Soft amnesia with record access
   - Claude builds out detailed frameworks
   - STATUS: Highly actionable. Extract sanitization pipeline, pricing 
     isolation architecture, logging framework.

3. **Soft Amnesia Deep Dive** (Human message 3, Claude response 3)
   - Exploratory session with multiple paths tried
   - PATH 1 (Pure Stateless): Explored and rejected—too restrictive
   - PATH 2 (Task State vs Conversation): Explored and refined
   - PATH 3 (Summarizer Pattern): Explored, determined optional for v1
   - Final convergence: "Artifact-First Memory Model"
   - STATUS: Extract final architecture only. Ignore rejected paths unless
     implementing alternatives.

### What to Extract

#### EXTRACT: Final Architectural Decisions
- Soft Amnesia architecture (final version with sliding window)
- Session state machine (with reset triggers)
- Context assembly function (what Claude sees each turn)
- Claim verification pattern
- No-promises architecture

#### EXTRACT: Security Specifications  
- Unicode/text sanitization pipeline (full attack vector list)
- Workflow-specific content filters
- Manipulation detection flags
- Input validation requirements

#### EXTRACT: Economic Isolation
- Marketing agent team structure
- Pricing configuration schema
- Customer tier handling
- Read-only access patterns

#### EXTRACT: Observability
- Metric taxonomy
- Alert tier definitions
- Logging architecture
- False negative minimization principle

### What to Skip/Deprioritize

#### SKIP: Abandoned Exploration Paths
- Pure stateless approach (Path 1 in soft amnesia exploration)
- Summarizer agent pattern (deferred to v2, not needed for v1)

#### SKIP: Unresolved Questions
- Specific velocity limit numbers (flagged for research)
- Exact reset thresholds (flagged for UX testing)
- Brand personality details (flagged for business decision)

#### DEPRIORITIZE: Examples and Illustrations
- Adversarial conversation examples are illustrative, not spec
- Can be used for test case generation but not implementation

### Key Decisions to Preserve

1. **No summarizer for v1** - Sliding window sufficient, revisit if needed
2. **2-turn sliding window** - Tentative, may need adjustment
3. **10-turn reset** - Tentative, may need adjustment  
4. **Claims as hypotheses** - Core pattern, must implement
5. **Structural incapacity** - Core principle, architecture enforces limits

### Implementation Priority Suggestion
