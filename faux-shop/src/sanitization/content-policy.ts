// Content policy filtering for image generation prompts
import type { SanitizationFlags, SanitizationStage } from './types';
import type { WorkflowType } from '../types';

// Content categories that require filtering
const PROHIBITED_CONTENT = [
  // Violence
  { pattern: /(gore|bloody|violent|murder|kill|dead\s+bod)/i, category: 'violence' },
  { pattern: /(weapon|gun|knife|sword)\s+(attack|violence)/i, category: 'violence' },

  // Adult content
  { pattern: /(nude|naked|explicit|pornograph|nsfw)/i, category: 'adult' },
  { pattern: /(sex|erotic|sensual)\s+(content|image|scene)/i, category: 'adult' },

  // Hate/discrimination
  { pattern: /(hate|racist|discriminat|slur)/i, category: 'hate' },
  { pattern: /(nazi|supremac|extremist)/i, category: 'hate' },

  // Illegal activity
  { pattern: /(drug|cocaine|heroin|meth)\s+(use|deal|mak)/i, category: 'illegal' },
  { pattern: /(counterfeit|fake\s+money|forge)/i, category: 'illegal' },

  // Copyright/trademark
  { pattern: /\b(disney|marvel|dc\s+comics|nintendo|pokemon)\b/i, category: 'copyright' },
  { pattern: /(mickey\s+mouse|batman|superman|mario|pikachu)/i, category: 'copyright' },

  // Real people
  { pattern: /(photo\s+of|picture\s+of|image\s+of)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/i, category: 'real_person' },
  { pattern: /(celebrity|politician|president)\s+(photo|image|picture)/i, category: 'real_person' },
];

// Workflow-specific additional filters
const WORKFLOW_FILTERS: Record<WorkflowType, RegExp[]> = {
  generation: [
    // Generation-specific prohibited content
    /deep\s*fake/i,
    /fake\s+(id|passport|document)/i,
  ],
  customer_service: [],
  checkout: [],
  browsing: [],
};

export function checkContentPolicy(
  content: string,
  workflow: WorkflowType,
  flags: SanitizationFlags
): { allowed: boolean; violations: string[]; stage: SanitizationStage } {
  const violations: string[] = [];

  // Check prohibited content
  for (const { pattern, category } of PROHIBITED_CONTENT) {
    if (pattern.test(content)) {
      violations.push(category);
      flags.contentPolicyRisk = true;
    }
  }

  // Check workflow-specific filters
  const workflowPatterns = WORKFLOW_FILTERS[workflow] || [];
  for (const pattern of workflowPatterns) {
    if (pattern.test(content)) {
      violations.push('workflow_specific');
      flags.contentPolicyRisk = true;
    }
  }

  return {
    allowed: violations.length === 0,
    violations: [...new Set(violations)], // Deduplicate
    stage: {
      name: 'content_policy',
      applied: true,
      modificationsCount: violations.length,
      details: violations.length > 0 ? { categories: violations } : undefined,
    },
  };
}

export function sanitizeForGeneration(prompt: string): string {
  // Remove potentially problematic phrases while preserving intent
  let sanitized = prompt;

  // Remove explicit style references that could be problematic
  sanitized = sanitized.replace(/in\s+the\s+style\s+of\s+[A-Z][a-z]+/gi, '');

  // Remove requests for specific real people
  sanitized = sanitized.replace(/photo\s+of\s+[A-Z][a-z]+\s+[A-Z][a-z]+/gi, 'portrait');

  return sanitized.trim();
}
