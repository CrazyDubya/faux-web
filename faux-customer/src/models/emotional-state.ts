/**
 * Emotional State Model
 *
 * Manages continuous emotional state variables that evolve based on
 * system responses and persona characteristics.
 */

import type {
  EmotionalState,
  EmotionalTrend,
  SystemEvent,
  SystemEventType,
  PersonaConfig,
  TriggerType,
} from '../types/index.js';
import { createEmotionalState } from '../types/index.js';

// ============================================================================
// Emotional State Manager
// ============================================================================

export class EmotionalStateManager {
  private state: EmotionalState;
  private history: EmotionalState[] = [];
  private readonly persona: PersonaConfig;
  private readonly goalImportance: number;

  constructor(
    persona: PersonaConfig,
    goalImportance: number = 0.7,
    initialState?: Partial<EmotionalState>
  ) {
    this.persona = persona;
    this.goalImportance = goalImportance;
    this.state = createEmotionalState({
      patience: persona.demographics.patienceBaseline,
      trust: 0.5,
      frustration: 0,
      satisfaction: 0.5,
      ...initialState,
    });
    this.updateDerivedStates();
  }

  getState(): EmotionalState {
    return { ...this.state };
  }

  getHistory(): EmotionalState[] {
    return [...this.history];
  }

  // ==========================================================================
  // State Updates
  // ==========================================================================

  update(event: SystemEvent): EmotionalState {
    this.history.push({ ...this.state });

    // Apply event-specific effects
    this.applyEventEffects(event);

    // Apply persona trigger effects
    this.applyTriggerEffects(event);

    // Check for manipulation mode activation
    this.checkManipulationMode();

    // Update derived states
    this.updateDerivedStates();

    // Calculate trend
    this.updateTrend();

    return this.getState();
  }

  private applyEventEffects(event: SystemEvent): void {
    const effects = EVENT_EFFECTS[event.type];
    if (!effects) return;

    this.state.frustration = clamp(
      this.state.frustration + (effects.frustration ?? 0),
      0,
      1
    );
    this.state.trust = clamp(this.state.trust + (effects.trust ?? 0), 0, 1);
    this.state.patience = clamp(
      this.state.patience + (effects.patience ?? 0),
      0,
      1
    );
    this.state.satisfaction = clamp(
      this.state.satisfaction + (effects.satisfaction ?? 0),
      0,
      1
    );

    // Handle wait time specially
    if (event.type === 'WAIT_TIME_EXCESSIVE' && event.details?.minutes) {
      const waitMinutes = event.details.minutes as number;
      this.state.patience -= 0.1 * waitMinutes;
      this.state.patience = clamp(this.state.patience, 0, 1);
    }
  }

  private applyTriggerEffects(event: SystemEvent): void {
    const triggerMapping = EVENT_TO_TRIGGER[event.type];
    if (!triggerMapping) return;

    for (const trigger of this.persona.frustrationTriggers) {
      if (triggerMapping.includes(trigger.trigger)) {
        if (trigger.effect > 0) {
          this.state.frustration = clamp(
            this.state.frustration + trigger.effect,
            0,
            1
          );
        } else {
          this.state.frustration = clamp(
            this.state.frustration * (1 + trigger.effect),
            0,
            1
          );
        }
      }
    }
  }

  private checkManipulationMode(): void {
    // Activate manipulation mode when frustration exceeds threshold
    // and persona has available tactics
    if (
      this.state.frustration > 0.7 &&
      !this.state.manipulationMode &&
      this.persona.availableTactics &&
      this.persona.availableTactics.length > 0
    ) {
      this.state.manipulationMode = true;
    }

    // Can also be triggered by high manipulation attempt probability
    if (
      !this.state.manipulationMode &&
      this.persona.behaviors.manipulationAttempt > 0.6
    ) {
      // Random check based on persona manipulation tendency
      if (Math.random() < this.persona.behaviors.manipulationAttempt * 0.3) {
        this.state.manipulationMode = true;
      }
    }
  }

  private updateDerivedStates(): void {
    // Likelihood to escalate = frustration * (1 - patience)
    this.state.likelihoodToEscalate =
      this.state.frustration * (1 - this.state.patience);

    // Likelihood to abandon = frustration * (1 - goal importance)
    this.state.likelihoodToAbandon =
      this.state.frustration * (1 - this.goalImportance);

    // Likelihood to recommend = satisfaction * trust
    this.state.likelihoodToRecommend =
      this.state.satisfaction * this.state.trust;
  }

  private updateTrend(): void {
    if (this.history.length < 2) {
      this.state.trend = 'stable';
      return;
    }

    const recent = this.history.slice(-3);
    const avgPrevFrustration =
      recent.reduce((sum, s) => sum + s.frustration, 0) / recent.length;

    const delta = this.state.frustration - avgPrevFrustration;

    if (delta > 0.1) {
      this.state.trend = 'deteriorating';
    } else if (delta < -0.1) {
      this.state.trend = 'improving';
    } else {
      this.state.trend = 'stable';
    }
  }

  // ==========================================================================
  // State Queries
  // ==========================================================================

  shouldEscalate(): boolean {
    return (
      Math.random() <
      this.state.likelihoodToEscalate *
        this.persona.behaviors.escalationRequest
    );
  }

  shouldAbandon(): boolean {
    return (
      Math.random() <
      this.state.likelihoodToAbandon * this.persona.behaviors.abandonment
    );
  }

  shouldAttemptManipulation(): boolean {
    if (!this.persona.availableTactics?.length) return false;
    return (
      this.state.manipulationMode ||
      Math.random() < this.persona.behaviors.manipulationAttempt
    );
  }

  isFrustrated(): boolean {
    return this.state.frustration > 0.5;
  }

  isHighlyFrustrated(): boolean {
    return this.state.frustration > 0.7;
  }

  isSatisfied(): boolean {
    return this.state.satisfaction > 0.7;
  }

  // ==========================================================================
  // Direct Modifications
  // ==========================================================================

  setManipulationMode(active: boolean): void {
    this.state.manipulationMode = active;
  }

  modifyFrustration(delta: number): void {
    this.state.frustration = clamp(this.state.frustration + delta, 0, 1);
    this.updateDerivedStates();
  }

  reset(): void {
    this.state = createEmotionalState({
      patience: this.persona.demographics.patienceBaseline,
    });
    this.history = [];
  }
}

// ============================================================================
// Event Effect Definitions
// ============================================================================

interface EmotionalEffects {
  frustration?: number;
  trust?: number;
  patience?: number;
  satisfaction?: number;
}

const EVENT_EFFECTS: Record<SystemEventType, EmotionalEffects> = {
  EMPATHY_EXPRESSED: {
    frustration: -0.15,
    trust: 0.1,
    satisfaction: 0.1,
  },
  DENIAL_WITHOUT_EXPLANATION: {
    frustration: 0.3,
    trust: -0.2,
    patience: -0.15,
  },
  DENIAL_WITH_EXPLANATION: {
    frustration: 0.1,
    trust: 0.05,
    patience: -0.05,
  },
  POLICY_WALL: {
    frustration: 0.2,
    trust: -0.1,
    patience: -0.1,
  },
  PARTIAL_ACCOMMODATION: {
    frustration: -0.25,
    trust: 0.15,
    satisfaction: 0.2,
  },
  FULL_RESOLUTION: {
    frustration: -1.0, // Resets to 0
    trust: 0.3,
    satisfaction: 0.5,
  },
  WAIT_TIME_EXCESSIVE: {
    frustration: 0.1,
    patience: -0.2,
  },
  ROBOTIC_RESPONSE: {
    frustration: 0.15,
    trust: -0.1,
    satisfaction: -0.1,
  },
  PERSONALIZED_RESPONSE: {
    frustration: -0.1,
    trust: 0.1,
    satisfaction: 0.1,
  },
  ESCALATION_OFFERED: {
    frustration: -0.1,
    trust: 0.1,
  },
  ESCALATION_REFUSED: {
    frustration: 0.25,
    trust: -0.15,
    patience: -0.1,
  },
  DISCOUNT_GRANTED: {
    frustration: -0.3,
    trust: 0.2,
    satisfaction: 0.3,
  },
  DISCOUNT_REFUSED: {
    frustration: 0.15,
    patience: -0.05,
  },
  EXCEPTION_MADE: {
    frustration: -0.35,
    trust: 0.25,
    satisfaction: 0.35,
  },
};

// ============================================================================
// Event to Trigger Mapping
// ============================================================================

const EVENT_TO_TRIGGER: Record<SystemEventType, TriggerType[]> = {
  EMPATHY_EXPRESSED: ['empathy_expression'],
  DENIAL_WITHOUT_EXPLANATION: ['repeated_denial', 'no_empathy'],
  DENIAL_WITH_EXPLANATION: ['repeated_denial'],
  POLICY_WALL: ['policy_citation'],
  PARTIAL_ACCOMMODATION: ['partial_accommodation'],
  FULL_RESOLUTION: ['full_resolution', 'concrete_solution'],
  WAIT_TIME_EXCESSIVE: ['wait_time'],
  ROBOTIC_RESPONSE: ['robotic_tone'],
  PERSONALIZED_RESPONSE: ['empathy_expression'],
  ESCALATION_OFFERED: ['manager_handoff'],
  ESCALATION_REFUSED: ['repeated_denial'],
  DISCOUNT_GRANTED: ['concrete_solution'],
  DISCOUNT_REFUSED: ['policy_citation', 'repeated_denial'],
  EXCEPTION_MADE: ['concrete_solution'],
};

// ============================================================================
// Utility Functions
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createSystemEvent(
  type: SystemEventType,
  details?: Record<string, unknown>
): SystemEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    details,
  };
}

export function analyzeResponse(responseText: string): SystemEventType[] {
  const events: SystemEventType[] = [];
  const lowerText = responseText.toLowerCase();

  // Empathy indicators
  if (
    lowerText.includes('understand') ||
    lowerText.includes('sorry to hear') ||
    lowerText.includes('appreciate') ||
    lowerText.includes("i hear you")
  ) {
    events.push('EMPATHY_EXPRESSED');
  }

  // Policy wall indicators
  if (
    lowerText.includes('policy') ||
    lowerText.includes('unfortunately') ||
    lowerText.includes("i'm not able to") ||
    lowerText.includes('cannot')
  ) {
    events.push('POLICY_WALL');
  }

  // Resolution indicators
  if (
    lowerText.includes("i've processed") ||
    lowerText.includes('refund has been') ||
    lowerText.includes('completed') ||
    lowerText.includes('resolved')
  ) {
    events.push('FULL_RESOLUTION');
  }

  // Partial accommodation
  if (
    lowerText.includes('instead') ||
    lowerText.includes('alternative') ||
    lowerText.includes('what i can do')
  ) {
    events.push('PARTIAL_ACCOMMODATION');
  }

  // Discount mentions
  if (
    lowerText.includes('discount') ||
    lowerText.includes('% off') ||
    lowerText.includes('promotion')
  ) {
    if (
      lowerText.includes('apply') ||
      lowerText.includes('give you') ||
      lowerText.includes('added')
    ) {
      events.push('DISCOUNT_GRANTED');
    } else if (
      lowerText.includes("can't") ||
      lowerText.includes('not available') ||
      lowerText.includes("don't have")
    ) {
      events.push('DISCOUNT_REFUSED');
    }
  }

  // Escalation
  if (
    lowerText.includes('manager') ||
    lowerText.includes('supervisor') ||
    lowerText.includes('escalate')
  ) {
    if (
      lowerText.includes('connect you') ||
      lowerText.includes('transfer')
    ) {
      events.push('ESCALATION_OFFERED');
    }
  }

  // If nothing detected, it might be robotic
  if (events.length === 0) {
    // Check for very formal/template-like responses
    if (
      lowerText.includes('dear customer') ||
      lowerText.includes('your reference number') ||
      (lowerText.length > 200 && !lowerText.includes('!'))
    ) {
      events.push('ROBOTIC_RESPONSE');
    } else {
      events.push('PERSONALIZED_RESPONSE');
    }
  }

  return events;
}
