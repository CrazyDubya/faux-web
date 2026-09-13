/**
 * Models Index
 */

export {
  EmotionalStateManager,
  createSystemEvent,
  analyzeResponse,
} from './emotional-state.js';

export {
  GoalManager,
  createGoalFromTemplate,
  GOAL_TEMPLATES,
} from './goal-manager.js';
export type { GoalSummary } from './goal-manager.js';
