/**
 * SimulaCust - Behavioral Simulation Agent Framework
 *
 * Main entry point and public API exports.
 */

// Types
export type {
  PersonaConfig,
  PersonaArchetype,
  Demographics,
  CommunicationStyle,
  BehaviorProbabilities,
  GoalWeights,
  TriggerEffect,
  TriggerType,
  Goal,
  GoalType,
  GoalStatus,
  TimeoutAction,
  EmotionalState,
  EmotionalTrend,
  JourneyState,
  ManipulationTactic,
  ManipulationFlag,
  Message,
  MessageRole,
  Conversation,
  SystemEvent,
  SystemEventType,
  SimulationResult,
  SimulationStatus,
  ScenarioConfig,
  InjectionEvent,
  InjectionTrigger,
  EvaluationScores,
} from './types/index.js';

export {
  createEmotionalState,
  createGoal,
  generateSimulationId,
  generateMessageId,
} from './types/index.js';

// Personas
export {
  PERSONAS,
  getPersona,
  getPersonaById,
  getPersonasByTier,
  getAdversarialPersonas,
  createPersonaVariant,
  sampleBehavior,
} from './personas/index.js';

// Models
export { EmotionalStateManager, createSystemEvent, analyzeResponse } from './models/emotional-state.js';
export { GoalManager, createGoalFromTemplate, GOAL_TEMPLATES } from './models/goal-manager.js';

// Tactics
export {
  TACTICS,
  TacticSelector,
  getTacticPromptContext,
  generateManipulationFlag,
  detectManipulation,
} from './tactics/index.js';

// Agents
export { CustomerAgent } from './agents/customer-agent.js';
export type { CustomerAgentConfig, AgentContext } from './agents/customer-agent.js';

// Scenarios
export {
  scenario,
  ScenarioBuilder,
  resolvePersona,
  shouldTriggerInjection,
  SCENARIOS,
  getScenariosByCategory,
  getAdversarialScenarios,
  getHappyPathScenarios,
  getAllScenarios,
} from './simulation/scenario.js';

// Simulation Runner
export {
  SimulationRunner,
  MockCommerceClient,
  runScenarios,
  aggregateResults,
} from './simulation/runner.js';
export type {
  SimulationRunnerConfig,
  CommerceClient,
  ParallelRunnerConfig,
  SuiteResults,
} from './simulation/runner.js';

// Evaluation
export {
  ConversationEvaluator,
  evaluateWithMetrics,
  generateReport,
} from './evaluation/evaluator.js';
export type { EvaluatorConfig, EvaluationReport } from './evaluation/evaluator.js';

// FauxBank Client
export {
  FauxBankClient,
  FauxBankAPIError,
  createMoney,
  formatMoney,
  withRetry,
} from './clients/fauxbank.js';
export type {
  FauxBankClientConfig,
  Money,
  Account,
  Transaction,
  AuthorizationResponse,
  BalanceResponse,
  AgentTokenResponse,
} from './clients/fauxbank.js';
