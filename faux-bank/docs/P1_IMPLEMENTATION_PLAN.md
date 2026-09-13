# P1 Implementation Plan - Service, Middleware & Route Tests

## 🎯 P1 Goals

**Current Coverage**: 11.34% overall (99.29% on utils/types)
**P1 Target**: 35-50% overall coverage
**Gap to Close**: +23.66% to +38.66%

## 📊 P1 Scope

### High Priority (Must Have for P1)
1. **Services** (2,024 lines, 0% → 50%+ target)
   - Impact: +20% overall coverage
   - Effort: High (need mocking strategy)
   
2. **Middleware** (365 lines, 0% → 60%+ target)
   - Impact: +5% overall coverage
   - Effort: Medium (context mocking)

### Medium Priority (Should Have for P1)
3. **Routes** (1,461 lines, 0% → 30%+ target)
   - Impact: +9% overall coverage
   - Effort: Medium (integration-style tests)

### Out of Scope for P1
- Durable Objects (complex, requires special setup)
- Index.ts (integration, low ROI)
- Full integration tests (P2 priority)

## 🚀 Implementation Strategy

### Phase 1: Service Tests (Target: 50-60% coverage)
**Estimated**: 60-80 tests, +20% overall coverage

Priority order (by simplicity & impact):
1. **agents.ts** (306 lines) - Helper functions first
2. **accounts.ts** (391 lines) - Validation logic
3. **compliance.ts** (374 lines) - Business rules
4. **ledger.ts** (393 lines) - Double-entry logic
5. **merchant.ts** (560 lines) - Complex workflows

Focus areas:
- ✅ Exported helper functions (pure logic)
- ✅ Validation logic (no DB required)
- ✅ Business rules (rate limits, capabilities)
- ✅ Error handling and edge cases
- ⏸️ Database operations (mock minimally)

### Phase 2: Middleware Tests (Target: 60-70% coverage)
**Estimated**: 20-30 tests, +5% overall coverage

Files to test:
1. **auth.ts** (165 lines)
   - Token validation
   - Capability checking
   - Error responses
   
2. **rate-limit.ts** (200 lines)
   - Rate limit calculations
   - Window tracking
   - Error responses

### Phase 3: Route Tests (Target: 20-30% coverage)
**Estimated**: 15-25 tests, +6% overall coverage

Focus on:
- Zod schema validation
- Error handling
- Response formatting
- Skip deep integration

## 📝 Test Count Projections

```
Module       Current  P1 Target  New Tests  Coverage Gain
──────────────────────────────────────────────────────────
Utils        107      107        0          Maintained 98.96%
Types        33       33         0          Maintained 100%
Services     0        60-80      60-80      +20% overall
Middleware   0        20-30      20-30      +5% overall
Routes       0        15-25      15-25      +6% overall
──────────────────────────────────────────────────────────
TOTAL        140      235-285    95-145     Target: 42-52%
```

## ✅ P1 Success Criteria

### Minimum (Must Achieve)
- [ ] 230+ tests passing
- [ ] 40%+ overall coverage
- [ ] Services: 50%+ coverage
- [ ] Middleware: 60%+ coverage
- [ ] All critical business logic tested

### Target (Should Achieve)
- [ ] 250+ tests passing
- [ ] 45%+ overall coverage
- [ ] Services: 60%+ coverage
- [ ] Middleware: 70%+ coverage
- [ ] Routes: 25%+ coverage

### Stretch (Nice to Have)
- [ ] 280+ tests passing
- [ ] 50%+ overall coverage
- [ ] Services: 70%+ coverage
- [ ] Middleware: 80%+ coverage
- [ ] Routes: 30%+ coverage

## 🔧 Implementation Approach

### Mocking Strategy
```typescript
// D1 Database Mock
const mockD1 = {
  prepare: (query: string) => ({
    bind: (...params: any[]) => ({
      first: async () => mockResult,
      all: async () => ({ results: mockResults }),
      run: async () => ({ success: true }),
    }),
  }),
};

// Hono Context Mock
const mockContext = {
  req: {
    header: (name: string) => mockHeaders[name],
    json: async () => mockBody,
  },
  json: (data: any, status?: number) => ({ data, status }),
  get: (key: string) => mockData[key],
  set: (key: string, value: any) => {},
};
```

### Test Organization
```
src/__tests__/
├── utils/          ✅ 107 tests (P0 complete)
├── types/          ✅ 33 tests (P0 complete)
├── services/       🔄 60-80 tests (P1 target)
│   ├── agents.test.ts
│   ├── accounts.test.ts
│   ├── compliance.test.ts
│   ├── ledger.test.ts
│   └── merchant.test.ts
├── middleware/     🔄 20-30 tests (P1 target)
│   ├── auth.test.ts
│   └── rate-limit.test.ts
└── routes/         🔄 15-25 tests (P1 target)
    ├── agents.test.ts
    ├── accounts.test.ts
    └── transactions.test.ts
```

## ⏱️ Time Estimate

### Phase 1: Services (High Priority)
- agents.ts tests: 45-60 minutes (12-15 tests)
- accounts.ts tests: 60-90 minutes (15-20 tests)
- compliance.ts tests: 60-75 minutes (12-18 tests)
- ledger.ts tests: 75-90 minutes (15-20 tests)
- merchant.ts tests: 90-120 minutes (20-25 tests)
**Subtotal**: 5.5-7.5 hours (74-98 tests)

### Phase 2: Middleware (High Priority)
- auth.ts tests: 45-60 minutes (12-18 tests)
- rate-limit.ts tests: 30-45 minutes (8-12 tests)
**Subtotal**: 1.25-1.75 hours (20-30 tests)

### Phase 3: Routes (Medium Priority)
- agents.ts tests: 30-40 minutes (5-8 tests)
- accounts.ts tests: 30-40 minutes (5-8 tests)
- transactions.ts tests: 30-40 minutes (5-8 tests)
**Subtotal**: 1.5-2 hours (15-24 tests)

**Total P1 Estimate**: 8-11 hours for 109-152 tests

## 🎊 Expected P1 Outcomes

### Coverage Projections
```
Conservative (50% services):
- Services: 50% × 2024 lines = 1012 lines
- Middleware: 60% × 365 lines = 219 lines  
- Routes: 20% × 1461 lines = 292 lines
- Total new coverage: 1523 lines
- Overall: (699 + 1523) / 5188 = 42.8% ✅

Realistic (60% services):
- Services: 60% × 2024 lines = 1214 lines
- Middleware: 70% × 365 lines = 256 lines
- Routes: 25% × 1461 lines = 365 lines
- Total new coverage: 1835 lines
- Overall: (699 + 1835) / 5188 = 48.9% ✅

Optimistic (70% services):
- Services: 70% × 2024 lines = 1417 lines
- Middleware: 80% × 365 lines = 292 lines
- Routes: 30% × 1461 lines = 438 lines
- Total new coverage: 2147 lines
- Overall: (699 + 2147) / 5188 = 54.9% ✅✅
```

## 📈 Success Metrics

| Metric | P0 Final | P1 Target | P1 Stretch |
|--------|----------|-----------|------------|
| Tests Passing | 140 | 230+ | 280+ |
| Overall Coverage | 11.34% | 40%+ | 50%+ |
| Services Coverage | 0% | 50%+ | 70%+ |
| Middleware Coverage | 0% | 60%+ | 80%+ |
| Routes Coverage | 0% | 20%+ | 30%+ |

---

**Status**: Ready to implement
**Priority**: Services > Middleware > Routes
**Timeline**: 8-11 hours estimated
**Expected Completion**: P1 complete with 40-50% coverage
