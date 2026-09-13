/**
 * Simulation Index
 */

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
} from './scenario.js';
export type { InjectionContext } from './scenario.js';

export {
  SimulationRunner,
  MockCommerceClient,
  runScenarios,
  aggregateResults,
} from './runner.js';
export type {
  SimulationRunnerConfig,
  CommerceClient,
  ParallelRunnerConfig,
  SuiteResults,
} from './runner.js';
