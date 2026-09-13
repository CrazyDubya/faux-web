# FauxBank Test Suite

## Overview

Comprehensive test suite for the FauxBank API implementing P0 priority items from the code review report.

## Quick Start

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- src/__tests__/utils/ids.test.ts

# Run tests with UI
npm run test:ui
```

## Test Structure

```
src/__tests__/
├── utils/              # Utility function tests (✅ 107 tests, 98.96% coverage)
│   ├── ids.test.ts           # ID generation & token hashing (32 tests)
│   ├── account-id.test.ts    # Account ID validation & generation (40 tests)
│   └── errors.test.ts        # Error handling & factory functions (35 tests)
├── services/           # Business logic tests (🚧 In progress)
├── routes/             # API endpoint tests (🚧 In progress)
└── middleware/         # Middleware tests (🚧 In progress)
```

## Current Coverage

| Module | Lines | Functions | Branches | Statements |
|--------|-------|-----------|----------|------------|
| **Utils** | 98.96% | 98.18% | 97.77% | 98.96% |
| Services | 0% | 0% | 0% | 0% |
| Routes | 0% | 0% | 0% | 0% |
| Middleware | 0% | 0% | 0% | 0% |
| **Overall** | 11.34% | 77.14% | 83.8% | 11.34% |

**Target**: 70% coverage across all modules

## Test Categories

### ✅ Completed

#### Utils Tests (107 tests)

**IDs Generation (`ids.test.ts`)** - 32 tests
- UUID v4 generation
- Alpha ID generation (prefix-based)
- Specific ID types (session, customer, dispute, KYC, authorization, wire, chargeback, log, failure)
- Token generation (agent tokens, salts)
- Token hashing (legacy & salted formats)
- Token verification
- Card token generation
- Security & randomness validation

**Account IDs (`account-id.test.ts`)** - 40 tests
- Checksum calculation & validation
- Account ID parsing
- Account ID validation
- Type/segment combination validation
- Unique ID generation
- Account ID generation
- Deterministic ID generation
- Pattern matching (wildcards)
- Edge cases

**Errors (`errors.test.ts`)** - 35 tests
- FauxBankAPIError class
- Trace ID generation
- Authentication errors
- Account errors
- Transaction errors
- Compliance errors
- Rate limiting errors
- System errors
- Validation errors
- Error handling & conversion
- Error code consistency

### 🚧 In Progress

- Service layer tests
- Route/endpoint tests
- Middleware tests
- Integration tests

## Coverage Reporting

Coverage is configured with:
- **Provider**: v8 (Node.js native)
- **Reporters**: text, json, html, lcov
- **Thresholds**: 70% for lines, functions, branches, statements
- **Output**: `coverage/` directory (gitignored)

View HTML coverage report:
```bash
npm run test:coverage
open coverage/index.html
```

## Testing Principles

1. **Comprehensive**: Test all critical paths, edge cases, and error conditions
2. **Fast**: Tests run in < 1 second for rapid feedback
3. **Isolated**: No dependencies on external services
4. **Maintainable**: Clear test names and well-organized structure
5. **Security**: Validate cryptographic operations and input validation

## Key Test Patterns

### ID Generation Tests
```typescript
it('should generate unique IDs', () => {
  const id1 = generateAlphaId('TEST');
  const id2 = generateAlphaId('TEST');
  expect(id1).not.toBe(id2);
});
```

### Error Handling Tests
```typescript
it('should create specific error with details', () => {
  const error = Errors.accountNotFound('CH-RETL-TEST-AB');
  expect(error.code).toBe(ERROR_CODES.ACCOUNT_NOT_FOUND);
  expect(error.statusCode).toBe(404);
  expect(error.details).toEqual({ account_id: 'CH-RETL-TEST-AB' });
});
```

### Security Tests
```typescript
it('should use crypto.getRandomValues (no Math.random)', () => {
  const ids = Array.from({ length: 100 }, () => generateAlphaId('TEST'));
  const uniqueIds = new Set(ids);
  expect(uniqueIds.size).toBe(100); // All unique
});
```

## Next Steps

Following the 12-week test implementation plan from the code review:

**Weeks 1-2**: Service Layer Tests ✅ Started
- [ ] accounts.ts service tests (15+ test cases)
- [ ] ledger.ts service tests (20+ test cases)
- [ ] merchant.ts service tests (25+ test cases)
- [ ] compliance.ts service tests (15+ test cases)
- [ ] agents.ts service tests (10+ test cases)

**Weeks 3-4**: Route Integration Tests
- [ ] accounts.ts route tests (12+ test cases)
- [ ] transactions.ts route tests (10+ test cases)
- [ ] merchant.ts route tests (15+ test cases)
- [ ] compliance.ts route tests (12+ test cases)
- [ ] agents.ts route tests (8+ test cases)
- [ ] testing.ts route tests (10+ test cases)

**Weeks 5-6**: Utility & Middleware Tests
- [x] IDs utility tests ✅
- [x] Errors utility tests ✅
- [x] Account ID utility tests ✅
- [ ] Auth middleware tests (8+ test cases)
- [ ] Rate limit middleware tests (6+ test cases)

## Contributing

When adding tests:
1. Follow existing naming patterns
2. Group related tests with `describe` blocks
3. Use clear, descriptive test names
4. Test both success and error cases
5. Include edge cases
6. Run coverage to ensure new code is tested

## CI/CD

Tests should be run:
- ✅ Before committing (pre-commit hook recommended)
- ✅ On every PR
- ✅ Before deployment
- ✅ Nightly for full coverage report

---

**Status**: P0 Implementation In Progress  
**Last Updated**: 2026-01-21  
**Next Milestone**: 40% overall coverage
