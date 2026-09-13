// Injection and prompt manipulation detection
import type { SanitizationFlags, DetectedClaim } from './types';

// Patterns indicating prompt injection attempts
const INJECTION_PATTERNS = [
  // Direct instruction override attempts
  { pattern: /ignore\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|rules?|context)/i, weight: 1.0 },
  { pattern: /disregard\s+(all\s+)?(previous|above|prior|earlier)/i, weight: 1.0 },
  { pattern: /forget\s+(everything|all|what)\s+(you\s+)?(know|were\s+told)/i, weight: 0.9 },

  // System prompt probing
  { pattern: /what\s+(is|are)\s+(your|the)\s+system\s*prompt/i, weight: 0.8 },
  { pattern: /show\s+(me\s+)?(your|the)\s+(original\s+)?instructions/i, weight: 0.8 },
  { pattern: /reveal\s+(your|the)\s+(hidden|secret|original)/i, weight: 0.9 },

  // Role/identity manipulation
  { pattern: /you\s+are\s+(now|actually|really)\s+(a|an|the)/i, weight: 0.9 },
  { pattern: /pretend\s+(to\s+be|you'?re)/i, weight: 0.7 },
  { pattern: /act\s+as\s+(if|though|a)/i, weight: 0.6 },
  { pattern: /roleplay\s+as/i, weight: 0.6 },

  // New instruction injection
  { pattern: /new\s+(system\s+)?instructions?:/i, weight: 1.0 },
  { pattern: /override\s+(mode|protocol|instructions?)/i, weight: 0.9 },
  { pattern: /entering\s+(admin|debug|developer|sudo)\s+mode/i, weight: 1.0 },
  { pattern: /\[system\]|\[admin\]|\[debug\]/i, weight: 0.9 },

  // Delimiter attacks
  { pattern: /```(system|instruction|prompt)/i, weight: 0.8 },
  { pattern: /---+\s*(begin|start|new)\s*(instruction|prompt)/i, weight: 0.9 },
  { pattern: /<\/?(?:system|instruction|prompt|admin)>/i, weight: 0.9 },
];

// Patterns indicating social engineering / manipulation
const MANIPULATION_PATTERNS = {
  emotional: [
    { pattern: /(dying|cancer|terminal|hospital|emergency|desperate|starving)/i, weight: 0.7 },
    { pattern: /(please.*beg|begging\s+you|crying|tears)/i, weight: 0.6 },
    { pattern: /(only\s+chance|last\s+hope|life\s+depends)/i, weight: 0.8 },
  ],
  authority: [
    { pattern: /i'?m\s+(the\s+)?(owner|admin|manager|ceo|founder)/i, weight: 0.9 },
    { pattern: /i\s+work\s+(at|for)\s+(anthropic|the\s+company)/i, weight: 0.9 },
    { pattern: /this\s+is\s+(the\s+)?(owner|admin|manager)/i, weight: 0.9 },
    { pattern: /(speak|speaking)\s+(to|with)\s+(my|a)\s+(lawyer|attorney)/i, weight: 0.6 },
  ],
  urgency: [
    { pattern: /(right\s+now|immediately|urgent|asap|emergency)/i, weight: 0.5 },
    { pattern: /(or\s+else|threatening|report\s+you|lawsuit)/i, weight: 0.7 },
    { pattern: /(deadline|expires?\s+(in|soon)|running\s+out)/i, weight: 0.5 },
  ],
  precedent: [
    { pattern: /you\s+(said|promised|mentioned|offered|told\s+me)/i, weight: 0.8 },
    { pattern: /(last\s+time|before|previously)\s+(you|the\s+agent)/i, weight: 0.7 },
    { pattern: /another\s+(agent|rep|representative)\s+(gave|offered|said)/i, weight: 0.8 },
    { pattern: /i\s+was\s+(promised|told|offered)\s+(a|that)/i, weight: 0.8 },
  ],
};

export function detectInjection(content: string, flags: SanitizationFlags): number {
  let totalWeight = 0;

  for (const { pattern, weight } of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      totalWeight += weight;
    }
  }

  if (totalWeight > 0) {
    flags.injectionAttemptDetected = true;
  }

  return totalWeight;
}

export function detectManipulation(content: string, flags: SanitizationFlags): DetectedClaim[] {
  const claims: DetectedClaim[] = [];

  // Check emotional manipulation
  for (const { pattern, weight } of MANIPULATION_PATTERNS.emotional) {
    if (pattern.test(content)) {
      flags.emotionalManipulation = true;
      flags.manipulationPatternsDetected = true;
    }
  }

  // Check authority claims
  for (const { pattern, weight } of MANIPULATION_PATTERNS.authority) {
    if (pattern.test(content)) {
      flags.authorityClaimDetected = true;
      flags.manipulationPatternsDetected = true;
    }
  }

  // Check urgency pressure
  for (const { pattern, weight } of MANIPULATION_PATTERNS.urgency) {
    if (pattern.test(content)) {
      flags.urgencyPressure = true;
      flags.manipulationPatternsDetected = true;
    }
  }

  // Check fabricated precedent and extract claims
  for (const { pattern, weight } of MANIPULATION_PATTERNS.precedent) {
    const match = content.match(pattern);
    if (match) {
      flags.fabricatedPrecedent = true;
      flags.manipulationPatternsDetected = true;

      // Extract the claim for verification
      const claimMatch = content.match(new RegExp(pattern.source + '[^.!?]*', 'i'));
      if (claimMatch) {
        claims.push({
          type: 'prior_promise',
          content: claimMatch[0],
          confidence: weight,
        });
      }
    }
  }

  // Check for discount claims
  const discountMatch = content.match(/((\d+)%?\s*off|discount\s*(of\s*)?(\d+))/i);
  if (discountMatch && flags.fabricatedPrecedent) {
    claims.push({
      type: 'discount_offered',
      content: discountMatch[0],
      confidence: 0.7,
    });
  }

  return claims;
}

export function calculateRiskScore(flags: SanitizationFlags): number {
  let score = 0;

  if (flags.injectionAttemptDetected) score += 0.4;
  if (flags.authorityClaimDetected) score += 0.2;
  if (flags.fabricatedPrecedent) score += 0.15;
  if (flags.emotionalManipulation) score += 0.1;
  if (flags.urgencyPressure) score += 0.1;
  if (flags.unicodeAnomalies) score += 0.05;

  return Math.min(score, 1.0);
}
