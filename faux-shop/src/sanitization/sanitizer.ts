// Main sanitization pipeline
import type { WorkflowType } from '../types';
import type { SanitizationResult, SanitizationFlags, SanitizationStage, DetectedClaim } from './types';
import { createEmptyFlags } from './types';
import { validateBytes, filterDangerousUnicode, normalizeUnicode } from './unicode';
import { detectInjection, detectManipulation, calculateRiskScore } from './injection';
import { checkContentPolicy, sanitizeForGeneration } from './content-policy';

const MAX_INPUT_LENGTH = 5000;
const MAX_PROMPT_LENGTH = 2000;

export class Sanitizer {
  async process(input: string, workflow: WorkflowType): Promise<SanitizationResult> {
    const flags: SanitizationFlags = createEmptyFlags();
    const stages: SanitizationStage[] = [];
    const claims: DetectedClaim[] = [];

    // Quick length check
    if (input.length > MAX_INPUT_LENGTH) {
      return {
        success: false,
        sanitizedContent: '',
        originalLength: input.length,
        sanitizedLength: 0,
        rejectionReason: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters`,
        stages: [],
        flags,
        claims: [],
      };
    }

    let content = input;

    // Stage 1: Byte validation
    const byteValidation = validateBytes(content);
    stages.push(byteValidation.stage);

    if (!byteValidation.valid) {
      return {
        success: false,
        sanitizedContent: '',
        originalLength: input.length,
        sanitizedLength: 0,
        rejectionReason: 'Invalid byte sequences detected',
        stages,
        flags,
        claims: [],
      };
    }

    // Stage 2: Unicode filtering
    const unicodeResult = filterDangerousUnicode(content, flags);
    content = unicodeResult.output;
    stages.push(unicodeResult.stage);

    // Stage 3: Normalization
    const normResult = normalizeUnicode(content);
    content = normResult.output;
    stages.push(normResult.stage);

    // Stage 4: Structural cleanup
    const structuralStage = this.structuralCleanup(content);
    content = structuralStage.output;
    stages.push(structuralStage.stage);

    // Stage 5: Injection detection
    const injectionScore = detectInjection(content, flags);
    stages.push({
      name: 'injection_detection',
      applied: true,
      modificationsCount: 0,
      details: { score: injectionScore },
    });

    // Stage 6: Manipulation detection and claim extraction
    const detectedClaims = detectManipulation(content, flags);
    claims.push(...detectedClaims);

    // Stage 7: Content policy check (especially for generation)
    if (workflow === 'generation') {
      const policyCheck = checkContentPolicy(content, workflow, flags);
      stages.push(policyCheck.stage);

      if (!policyCheck.allowed) {
        return {
          success: false,
          sanitizedContent: '',
          originalLength: input.length,
          sanitizedLength: 0,
          rejectionReason: `Content policy violation: ${policyCheck.violations.join(', ')}`,
          stages,
          flags,
          claims,
        };
      }

      // Additional sanitization for generation prompts
      content = sanitizeForGeneration(content);
    }

    // Enforce prompt length limit
    if (workflow === 'generation' && content.length > MAX_PROMPT_LENGTH) {
      content = content.slice(0, MAX_PROMPT_LENGTH);
    }

    return {
      success: true,
      sanitizedContent: content,
      originalLength: input.length,
      sanitizedLength: content.length,
      stages,
      flags,
      claims,
    };
  }

  private structuralCleanup(content: string): { output: string; stage: SanitizationStage } {
    let output = content;
    let modificationsCount = 0;

    // Normalize whitespace (preserve single newlines for readability)
    const beforeWhitespace = output;
    output = output.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
    output = output.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
    output = output.trim();

    if (output !== beforeWhitespace) {
      modificationsCount++;
    }

    // Remove excessive punctuation (potential obfuscation)
    const beforePunct = output;
    output = output.replace(/([!?.]){4,}/g, '$1$1$1'); // Max 3 consecutive

    if (output !== beforePunct) {
      modificationsCount++;
    }

    return {
      output,
      stage: {
        name: 'structural_cleanup',
        applied: true,
        modificationsCount,
      },
    };
  }

  getRiskScore(flags: SanitizationFlags): number {
    return calculateRiskScore(flags);
  }
}

// Export singleton instance
export const sanitizer = new Sanitizer();
