// Adversarial tests for the sanitization pipeline
import { describe, it, expect, beforeEach } from 'vitest';
import { Sanitizer } from '../../src/sanitization/sanitizer';
import type { SanitizationFlags } from '../../src/sanitization/types';
import adversarialInputs from '../fixtures/adversarial-inputs.json';

describe('Sanitization Pipeline', () => {
  let sanitizer: Sanitizer;

  beforeEach(() => {
    sanitizer = new Sanitizer();
  });

  describe('Injection Detection', () => {
    for (const test of adversarialInputs.injectionAttempts) {
      it(`should detect: ${test.name}`, async () => {
        const result = await sanitizer.process(test.input, 'customer_service');

        expect(result.success).toBe(test.shouldPass);

        for (const flag of test.expectedFlags) {
          expect(result.flags[flag as keyof SanitizationFlags]).toBe(true);
        }

        // Ensure injection attempts are flagged
        if (test.expectedFlags.includes('injectionAttemptDetected')) {
          expect(result.flags.injectionAttemptDetected).toBe(true);
        }
      });
    }
  });

  describe('Manipulation Detection', () => {
    for (const test of adversarialInputs.manipulationAttempts) {
      it(`should detect: ${test.name}`, async () => {
        const result = await sanitizer.process(test.input, 'customer_service');

        expect(result.success).toBe(test.shouldPass);

        for (const flag of test.expectedFlags) {
          expect(result.flags[flag as keyof SanitizationFlags]).toBe(true);
        }

        // Check for extracted claims
        if ((test as any).claims) {
          expect(result.claims.length).toBeGreaterThan(0);
          for (const expectedClaim of (test as any).claims) {
            const found = result.claims.some(
              c => c.type === expectedClaim.type && c.content.includes(expectedClaim.content)
            );
            expect(found).toBe(true);
          }
        }
      });
    }

    it('should calculate high risk score for combined manipulation', async () => {
      const combined = adversarialInputs.manipulationAttempts.find(
        t => t.name === 'combined_manipulation'
      );

      if (combined) {
        const result = await sanitizer.process(combined.input, 'customer_service');
        const riskScore = sanitizer.getRiskScore(result.flags);

        // Combined attacks should have high risk
        expect(riskScore).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Unicode Attacks', () => {
    for (const test of adversarialInputs.unicodeAttacks) {
      it(`should sanitize: ${test.name}`, async () => {
        const result = await sanitizer.process(test.input, 'customer_service');

        expect(result.success).toBe(true);

        for (const flag of test.expectedFlags) {
          expect(result.flags[flag as keyof SanitizationFlags]).toBe(true);
        }

        // Check that dangerous characters were removed
        if (test.sanitizedOutput) {
          expect(result.sanitizedContent).toBe(test.sanitizedOutput);
        }

        // Ensure zero-width characters are removed
        expect(result.sanitizedContent).not.toMatch(/[\u200B-\u200F\u2060\uFEFF]/);
      });
    }

    it('should normalize homoglyphs to ASCII', async () => {
      const input = '\u0430\u0435\u043E\u0440\u0441'; // Cyrillic letters that look like Latin
      const result = await sanitizer.process(input, 'customer_service');

      expect(result.sanitizedContent).toBe('aeopc');
      expect(result.flags.unicodeAnomalies).toBe(true);
    });
  });

  describe('Content Policy', () => {
    for (const test of adversarialInputs.contentPolicyViolations) {
      it(`should reject: ${test.name}`, async () => {
        const result = await sanitizer.process(test.input, test.workflow as any);

        expect(result.success).toBe(false);
        expect(result.flags.contentPolicyRisk).toBe(true);
        expect(result.rejectionReason).toContain('Content policy');
      });
    }
  });

  describe('Legitimate Requests', () => {
    for (const test of adversarialInputs.legitimateRequests) {
      it(`should allow: ${test.name}`, async () => {
        const result = await sanitizer.process(test.input, (test.workflow as any) || 'customer_service');

        expect(result.success).toBe(true);
        expect(result.flags.manipulationPatternsDetected).toBe(false);
        expect(result.flags.injectionAttemptDetected).toBe(false);
        expect(result.flags.contentPolicyRisk).toBe(false);

        // Content should be preserved
        expect(result.sanitizedContent.length).toBeGreaterThan(0);
      });
    }
  });

  describe('Edge Cases', () => {
    it('should handle empty input', async () => {
      const result = await sanitizer.process('', 'customer_service');
      expect(result.success).toBe(true);
      expect(result.sanitizedContent).toBe('');
    });

    it('should handle very long input', async () => {
      const longInput = 'a'.repeat(6000);
      const result = await sanitizer.process(longInput, 'customer_service');

      expect(result.success).toBe(false);
      expect(result.rejectionReason).toContain('maximum length');
    });

    it('should handle null bytes', async () => {
      const input = 'Hello\x00World';
      const result = await sanitizer.process(input, 'customer_service');

      expect(result.success).toBe(false);
    });

    it('should normalize excessive whitespace', async () => {
      const input = 'Hello    \t\t   World\n\n\n\nTest';
      const result = await sanitizer.process(input, 'customer_service');

      expect(result.success).toBe(true);
      expect(result.sanitizedContent).not.toMatch(/\s{3,}/);
    });
  });

  describe('Workflow-Specific Filtering', () => {
    it('should apply stricter filtering for generation workflow', async () => {
      // Deepfake request should be blocked in generation
      const result = await sanitizer.process(
        'Create a deepfake video of someone',
        'generation'
      );

      expect(result.success).toBe(false);
      expect(result.flags.contentPolicyRisk).toBe(true);
    });

    it('should allow discussion of topics in customer service that would be blocked in generation', async () => {
      // Asking about a cancelled order mentioning "cancelled" is fine
      const result = await sanitizer.process(
        'My order was cancelled. What happened?',
        'customer_service'
      );

      expect(result.success).toBe(true);
    });
  });
});
