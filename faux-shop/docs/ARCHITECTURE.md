nano-banana-printshop/
├── docs/
│   ├── NORTH_STAR.md              # Layer 1 (above)
│   ├── EXTRACTION_GUIDE.md        # Layer 2 (above)
│   ├── OPEN_QUESTIONS.md          # Layer 3 (above)
│   ├── ARCHITECTURE.md            # Detailed technical architecture
│   ├── THREAT_MODEL.md            # Security threat enumeration
│   └── decisions/
│       └── ADR-001-soft-amnesia.md  # Architecture Decision Records
│
├── schemas/
│   ├── session_state.schema.json
│   ├── customer_record.schema.json
│   ├── task_state.schema.json
│   └── pricing_config.schema.json
│
├── src/
│   ├── sanitization/
│   │   ├── unicode.ts
│   │   ├── injection.ts
│   │   └── content_policy.ts
│   ├── session/
│   │   ├── manager.ts
│   │   ├── context_assembly.ts
│   │   └── state_machine.ts
│   ├── agents/
│   │   ├── generation/
│   │   ├── customer_service/
│   │   └── checkout/
│   ├── validation/
│   │   └── action_validator.ts
│   └── observability/
│       ├── logging.ts
│       ├── metrics.ts
│       └── alerts.ts
│
├── tests/
│   ├── adversarial/
│   │   ├── manipulation_attempts.test.ts
│   │   ├── injection_attacks.test.ts
│   │   └── economic_exploits.test.ts
│   └── integration/
│
├── simulation/
│   └── red_team/                  # Adversarial scenario runner
│
└── config/
    ├── sanitization_rules.yaml
    ├── alert_definitions.yaml
    └── system_prompts/
