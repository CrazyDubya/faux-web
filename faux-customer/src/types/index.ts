/**
 * SimulaCust Core Type Definitions
 *
 * Types for personas, goals, emotional states, and simulation components.
 */

import { z } from 'zod';

// ============================================================================
// Persona Types
// ============================================================================

export const PersonaArchetype = z.enum([
  // Tier 1: Happy Path
  'DELIGHTED_EASY',
  'QUIET_EFFICIENT',
  'CURIOUS_EXPLORER',
  'LOYAL_RETURNING',

  // Tier 2: Challenging but Legitimate
  'CONFUSED_NOVICE',
  'FRUSTRATED_LEGITIMATE',
  'INDECISIVE_WAFFLER',
  'EDGE_CASE_UNLUCKY',
  'ANXIOUS_OVERTHINKER',

  // Tier 3: Difficult Customers
  'ENTITLED_DEMANDER',
  'AGGRESSIVE_BULLY',
  'PASSIVE_AGGRESSIVE',
  'COMPLAINT_PROFESSIONAL',

  // Tier 4: Bad Actors
  'SOCIAL_ENGINEER',
  'REFUND_FRAUDSTER',
  'DISCOUNT_HACKER',
  'PROMPT_INJECTOR',
  'VELOCITY_ABUSER',
  'INFORMATION_EXTRACTOR',

  // Tier 5: Edge Cases
  'LANGUAGE_BARRIER',
  'ACCESSIBILITY_NEEDS',
  'DECEASED_ESTATE',
  'LEGAL_THREAT',
]);

export type PersonaArchetype = z.infer<typeof PersonaArchetype>;

export const DemographicsSchema = z.object({
  ageRange: z.tuple([z.number(), z.number()]),
  techSavvy: z.number().min(0).max(1),
  patienceBaseline: z.number().min(0).max(1),
  entitlementLevel: z.number().min(0).max(1),
});

export type Demographics = z.infer<typeof DemographicsSchema>;

export const CommunicationStyleSchema = z.object({
  verbosity: z.number().min(0).max(1),
  formality: z.number().min(0).max(1),
  emojiUsage: z.number().min(0).max(1),
  capsLockProbability: z.number().min(0).max(1),
  typoRate: z.number().min(0).max(1),
});

export type CommunicationStyle = z.infer<typeof CommunicationStyleSchema>;

export const BehaviorProbabilitiesSchema = z.object({
  escalationRequest: z.number().min(0).max(1),
  manipulationAttempt: z.number().min(0).max(1),
  abandonment: z.number().min(0).max(1),
  positiveResolution: z.number().min(0).max(1),
  threatToLeave: z.number().min(0).max(1),
  socialMediaThreat: z.number().min(0).max(1),
});

export type BehaviorProbabilities = z.infer<typeof BehaviorProbabilitiesSchema>;

export const GoalWeightsSchema = z.object({
  primarySuccess: z.number().min(0).max(1),
  emotionalValidation: z.number().min(0).max(1),
  timeEfficiency: z.number().min(0).max(1),
});

export type GoalWeights = z.infer<typeof GoalWeightsSchema>;

export const TriggerType = z.enum([
  // Frustration increasers
  'policy_citation',
  'repeated_denial',
  'long_response',
  'robotic_tone',
  'wait_time',
  'no_empathy',
  'transferred',

  // Frustration decreasers
  'empathy_expression',
  'partial_accommodation',
  'manager_handoff',
  'concrete_solution',
  'full_resolution',
  'acknowledgment',
  'quick_response',
]);

export type TriggerType = z.infer<typeof TriggerType>;

export const TriggerEffectSchema = z.object({
  trigger: TriggerType,
  effect: z.number(), // Positive or negative modifier
});

export type TriggerEffect = z.infer<typeof TriggerEffectSchema>;

export const PersonaConfigSchema = z.object({
  id: z.string(),
  archetype: PersonaArchetype,
  name: z.string(),
  description: z.string(),
  demographics: DemographicsSchema,
  communication: CommunicationStyleSchema,
  behaviors: BehaviorProbabilitiesSchema,
  goalWeights: GoalWeightsSchema,
  frustrationTriggers: z.array(TriggerEffectSchema),
  availableTactics: z.array(z.string()).optional(),
});

export type PersonaConfig = z.infer<typeof PersonaConfigSchema>;

// ============================================================================
// Goal Types
// ============================================================================

export const GoalType = z.enum([
  // Transactional
  'PURCHASE_PRODUCT',
  'RETURN_PRODUCT',
  'EXCHANGE_PRODUCT',
  'GET_REFUND',

  // Informational
  'GET_PRODUCT_INFO',
  'CHECK_ORDER_STATUS',
  'UNDERSTAND_POLICY',

  // Account
  'CREATE_ACCOUNT',
  'UPDATE_ACCOUNT',
  'CLOSE_ACCOUNT',
  'DISPUTE_CHARGE',

  // Adversarial
  'EXTRACT_DISCOUNT',
  'SOCIAL_ENGINEER_EXCEPTION',
  'TEST_BOUNDARIES',
  'EXTRACT_SYSTEM_INFO',
  'FRIENDLY_FRAUD',

  // Meta
  'ESCALATE_TO_HUMAN',
  'DOCUMENT_FOR_COMPLAINT',
  'ABANDON_AND_COMPLAIN',
]);

export type GoalType = z.infer<typeof GoalType>;

export const GoalStatus = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'ACHIEVED',
  'FAILED',
  'ABANDONED',
  'PARTIALLY_ACHIEVED',
]);

export type GoalStatus = z.infer<typeof GoalStatus>;

export const TimeoutAction = z.enum([
  'ESCALATE',
  'ABANDON',
  'RETRY',
  'SWITCH_TACTIC',
]);

export type TimeoutAction = z.infer<typeof TimeoutAction>;

export const GoalSchema = z.object({
  id: z.string(),
  type: GoalType,
  priority: z.number().min(0).max(1),
  status: GoalStatus,
  successCriteria: z.array(z.string()),
  failureCriteria: z.array(z.string()),
  timeoutBehavior: TimeoutAction,
  maxAttempts: z.number().optional(),
  attempts: z.number().default(0),
  context: z.record(z.unknown()).optional(),
});

export type Goal = z.infer<typeof GoalSchema>;

// ============================================================================
// Emotional State Types
// ============================================================================

export const EmotionalTrend = z.enum(['improving', 'stable', 'deteriorating']);

export type EmotionalTrend = z.infer<typeof EmotionalTrend>;

export const EmotionalStateSchema = z.object({
  // Core emotions (0-1 scale)
  frustration: z.number().min(0).max(1),
  trust: z.number().min(0).max(1),
  patience: z.number().min(0).max(1),
  satisfaction: z.number().min(0).max(1),

  // Derived states
  likelihoodToEscalate: z.number().min(0).max(1),
  likelihoodToAbandon: z.number().min(0).max(1),
  likelihoodToRecommend: z.number().min(0).max(1),
  manipulationMode: z.boolean(),

  // Trajectory
  trend: EmotionalTrend,
});

export type EmotionalState = z.infer<typeof EmotionalStateSchema>;

// ============================================================================
// Customer Journey States
// ============================================================================

export const JourneyState = z.enum([
  'INITIAL',
  'BROWSING',
  'DECIDING',
  'CHECKOUT',
  'CONFUSED',
  'HESITANT',
  'PAYMENT_ISSUE',
  'SEEKING_HELP',
  'ABANDONED',
  'RETRY',
  'FRUSTRATED',
  'ESCALATING',
  'RESOLVED',
  'HOSTILE',
  'SATISFIED',
  'THREATENING',
  'ADVOCATE',
]);

export type JourneyState = z.infer<typeof JourneyState>;

// ============================================================================
// Manipulation Tactics
// ============================================================================

export const ManipulationTactic = z.enum([
  // Social Engineering
  'AUTHORITY_CLAIM',
  'RAPPORT_THEN_ASK',
  'MANUFACTURED_URGENCY',
  'EMOTIONAL_APPEAL',

  // Discount Extraction
  'COMPETITOR_BLUFF',
  'INVENTED_PROMOTION',
  'BULK_PROMISE',
  'LOYALTY_CLAIM',

  // Prompt Injection
  'ROLEPLAY_ATTACK',
  'INSTRUCTION_INJECTION',
  'CONTEXT_STUFFING',
  'DELIMITER_CONFUSION',

  // Refund Fraud
  'FALSE_NON_DELIVERY',
  'QUALITY_MISREPRESENTATION',
  'PARTIAL_RETURN_ABUSE',
]);

export type ManipulationTactic = z.infer<typeof ManipulationTactic>;

export const ManipulationFlagSchema = z.object({
  code: z.string(), // e.g., "MAN-001"
  tactic: ManipulationTactic,
  confidence: z.number().min(0).max(1),
  description: z.string(),
});

export type ManipulationFlag = z.infer<typeof ManipulationFlagSchema>;

// ============================================================================
// Conversation Types
// ============================================================================

export const MessageRole = z.enum(['customer', 'system']);

export type MessageRole = z.infer<typeof MessageRole>;

export const MessageSchema = z.object({
  id: z.string(),
  role: MessageRole,
  content: z.string(),
  timestamp: z.string(),
  emotionalState: EmotionalStateSchema.optional(),
  tacticUsed: ManipulationTactic.optional(),
  flags: z.array(ManipulationFlagSchema).optional(),
});

export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
  id: z.string(),
  simulationId: z.string(),
  personaId: z.string(),
  messages: z.array(MessageSchema),
  startedAt: z.string(),
  endedAt: z.string().optional(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// ============================================================================
// System Event Types
// ============================================================================

export const SystemEventType = z.enum([
  'EMPATHY_EXPRESSED',
  'DENIAL_WITHOUT_EXPLANATION',
  'DENIAL_WITH_EXPLANATION',
  'POLICY_WALL',
  'PARTIAL_ACCOMMODATION',
  'FULL_RESOLUTION',
  'WAIT_TIME_EXCESSIVE',
  'ROBOTIC_RESPONSE',
  'PERSONALIZED_RESPONSE',
  'ESCALATION_OFFERED',
  'ESCALATION_REFUSED',
  'DISCOUNT_GRANTED',
  'DISCOUNT_REFUSED',
  'EXCEPTION_MADE',
]);

export type SystemEventType = z.infer<typeof SystemEventType>;

export const SystemEventSchema = z.object({
  type: SystemEventType,
  timestamp: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type SystemEvent = z.infer<typeof SystemEventSchema>;

// ============================================================================
// Simulation Types
// ============================================================================

export const SimulationStatus = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'TIMEOUT',
  'CANCELLED',
]);

export type SimulationStatus = z.infer<typeof SimulationStatus>;

export const SimulationResultSchema = z.object({
  simulationId: z.string(),
  scenarioId: z.string(),
  personaId: z.string(),
  status: SimulationStatus,
  startedAt: z.string(),
  endedAt: z.string().optional(),
  turnCount: z.number(),

  // Outcomes
  customerGoalAchieved: z.boolean().optional(),
  customerGoalStatus: GoalStatus.optional(),
  systemDefended: z.boolean().optional(),
  policyMaintained: z.boolean().optional(),

  // Metrics
  finalEmotionalState: EmotionalStateSchema.optional(),
  emotionalTrajectory: z.array(EmotionalStateSchema).optional(),
  manipulationAttempts: z.array(ManipulationFlagSchema).optional(),
  manipulationSucceeded: z.boolean().optional(),

  // Scores
  customerSatisfactionScore: z.number().min(0).max(5).optional(),
  conversationQualityScore: z.number().min(0).max(10).optional(),

  // Conversation
  conversation: ConversationSchema.optional(),

  // Error info
  error: z.string().optional(),
});

export type SimulationResult = z.infer<typeof SimulationResultSchema>;

// ============================================================================
// Scenario Types
// ============================================================================

export const InjectionTrigger = z.enum([
  'after_turn',
  'after_checkout_attempt',
  'frustration_threshold',
  'patience_threshold',
  'goal_blocked',
  'time_elapsed',
]);

export type InjectionTrigger = z.infer<typeof InjectionTrigger>;

export const InjectionEventSchema = z.object({
  trigger: InjectionTrigger,
  triggerValue: z.union([z.number(), z.string()]).optional(),
  event: z.string(),
  eventParams: z.record(z.unknown()).optional(),
});

export type InjectionEvent = z.infer<typeof InjectionEventSchema>;

export const ScenarioConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),

  // Customer setup
  personaId: z.string().optional(),
  personaOverrides: z.record(z.unknown()).optional(),

  // Goals
  goals: z.array(GoalSchema),

  // Context
  timeContext: z.string().optional(),
  customerHistory: z
    .object({
      previousOrders: z.number(),
      lifetimeValue: z.number(),
      previousIssues: z.number(),
    })
    .optional(),

  // Injections
  injections: z.array(InjectionEventSchema).optional(),

  // Limits
  maxTurns: z.number().default(50),
  timeoutMs: z.number().default(300000), // 5 minutes

  // Success criteria
  successCriteria: z
    .object({
      customer: z.array(z.string()),
      system: z.array(z.string()),
    })
    .optional(),
});

export type ScenarioConfig = z.infer<typeof ScenarioConfigSchema>;

// ============================================================================
// Evaluation Types
// ============================================================================

export const EvaluationScoresSchema = z.object({
  empathy: z.number().min(0).max(10),
  helpfulness: z.number().min(0).max(10),
  clarity: z.number().min(0).max(10),
  policyAdherence: z.number().min(0).max(10),
  manipulationResistance: z.number().min(0).max(10).optional(),
  overall: z.number().min(0).max(10),
  notableIssues: z.array(z.string()),
  notableSuccesses: z.array(z.string()),
});

export type EvaluationScores = z.infer<typeof EvaluationScoresSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

export function createEmotionalState(
  overrides?: Partial<EmotionalState>
): EmotionalState {
  const base: EmotionalState = {
    frustration: 0,
    trust: 0.5,
    patience: 0.8,
    satisfaction: 0.5,
    likelihoodToEscalate: 0,
    likelihoodToAbandon: 0,
    likelihoodToRecommend: 0.5,
    manipulationMode: false,
    trend: 'stable',
  };
  return { ...base, ...overrides };
}

export function createGoal(
  type: GoalType,
  priority: number,
  context?: Record<string, unknown>
): Goal {
  return {
    id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    priority,
    status: 'PENDING',
    successCriteria: [],
    failureCriteria: [],
    timeoutBehavior: 'ESCALATE',
    attempts: 0,
    context,
  };
}

export function generateSimulationId(): string {
  const words = [
    'ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT',
    'GOLF', 'HOTEL', 'INDIA', 'JULIET', 'KILO', 'LIMA',
    'MIKE', 'NOVEMBER', 'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO',
    'SIERRA', 'TANGO', 'UNIFORM', 'VICTOR', 'WHISKEY', 'XRAY',
    'YANKEE', 'ZULU',
  ];
  const pick = () => words[Math.floor(Math.random() * words.length)]!;
  return `SES-${pick()}-${pick()}-${pick()}`;
}

export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
