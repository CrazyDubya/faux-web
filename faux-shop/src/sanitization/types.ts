// Sanitization types and interfaces

export interface SanitizationFlags {
  injectionAttemptDetected: boolean;
  manipulationPatternsDetected: boolean;
  emotionalManipulation: boolean;
  authorityClaimDetected: boolean;
  urgencyPressure: boolean;
  fabricatedPrecedent: boolean;
  unicodeAnomalies: boolean;
  contentPolicyRisk: boolean;
}

export interface DetectedClaim {
  type: ClaimType;
  content: string;
  confidence: number;
}

export type ClaimType =
  | 'prior_promise'
  | 'shipping_method'
  | 'order_status'
  | 'account_tier'
  | 'previous_purchase'
  | 'discount_offered'
  | 'agent_said';

export interface SanitizationStage {
  name: StageName;
  applied: boolean;
  modificationsCount: number;
  details?: Record<string, unknown>;
}

export type StageName =
  | 'byte_validation'
  | 'codepoint_filter'
  | 'normalization'
  | 'structural_cleanup'
  | 'injection_detection'
  | 'content_policy';

export interface SanitizationResult {
  success: boolean;
  sanitizedContent: string;
  originalLength: number;
  sanitizedLength: number;
  rejectionReason?: string;
  stages: SanitizationStage[];
  flags: SanitizationFlags;
  claims: DetectedClaim[];
}

export const createEmptyFlags = (): SanitizationFlags => ({
  injectionAttemptDetected: false,
  manipulationPatternsDetected: false,
  emotionalManipulation: false,
  authorityClaimDetected: false,
  urgencyPressure: false,
  fabricatedPrecedent: false,
  unicodeAnomalies: false,
  contentPolicyRisk: false,
});
