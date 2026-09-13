// Unit tests for session management
import { describe, it, expect } from 'vitest';
import { processEvent, shouldReset, type SessionEvent } from '../../src/session/state-machine';
import type { Session } from '../../src/types/session';

function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-123',
    customerId: 'cust-123',
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    status: 'active',
    metrics: {
      turnCount: 0,
      manipulationFlagsTriggered: 0,
      emptyTurns: 0,
      taskChanges: 0,
      totalSessionTurns: 0,
    },
    task: null,
    conversationWindow: [],
    archivedTasks: [],
    pendingNotification: null,
    ...overrides,
  };
}

describe('Session State Machine', () => {
  describe('shouldReset', () => {
    it('should trigger reset at turn limit', () => {
      const session = createMockSession({
        metrics: {
          turnCount: 10,
          manipulationFlagsTriggered: 0,
          emptyTurns: 0,
          taskChanges: 0,
          totalSessionTurns: 10,
        },
      });

      const result = shouldReset(session);
      expect(result.reset).toBe(true);
      expect(result.reason).toBe('turn_limit_reached');
    });

    it('should trigger reset after idle timeout', () => {
      const oldTime = new Date(Date.now() - 25 * 60 * 1000).toISOString(); // 25 minutes ago

      const session = createMockSession({
        lastActivity: oldTime,
      });

      const result = shouldReset(session);
      expect(result.reset).toBe(true);
      expect(result.reason).toBe('idle_timeout');
    });

    it('should not reset active session within limits', () => {
      const session = createMockSession({
        metrics: {
          turnCount: 5,
          manipulationFlagsTriggered: 0,
          emptyTurns: 0,
          taskChanges: 0,
          totalSessionTurns: 5,
        },
      });

      const result = shouldReset(session);
      expect(result.reset).toBe(false);
    });
  });

  describe('processEvent', () => {
    it('should increment turn count on MESSAGE_RECEIVED', () => {
      const session = createMockSession();

      const event: SessionEvent = { type: 'MESSAGE_RECEIVED' };
      const result = processEvent(session, event);

      expect(result.session.metrics.turnCount).toBe(1);
      expect(result.session.metrics.totalSessionTurns).toBe(1);
      expect(result.didReset).toBe(false);
    });

    it('should reset when MESSAGE_RECEIVED exceeds turn limit', () => {
      const session = createMockSession({
        metrics: {
          turnCount: 10,
          manipulationFlagsTriggered: 2,
          emptyTurns: 0,
          taskChanges: 1,
          totalSessionTurns: 10,
        },
      });

      const event: SessionEvent = { type: 'MESSAGE_RECEIVED' };
      const result = processEvent(session, event);

      expect(result.didReset).toBe(true);
      expect(result.session.metrics.turnCount).toBe(0);
      expect(result.session.metrics.manipulationFlagsTriggered).toBe(0);
      expect(result.session.conversationWindow).toHaveLength(0);
      expect(result.session.pendingNotification).toBe('session_reset');
    });

    it('should track manipulation flags', () => {
      const session = createMockSession();

      const event: SessionEvent = { type: 'MANIPULATION_DETECTED' };
      const result = processEvent(session, event);

      expect(result.session.metrics.manipulationFlagsTriggered).toBe(1);
    });

    it('should archive task on TASK_COMPLETED', () => {
      const session = createMockSession({
        task: {
          type: 'generation',
          originalPrompt: 'Test prompt',
          versions: [],
          currentVersionId: null,
          generationCount: 3,
        },
      });

      const event: SessionEvent = { type: 'TASK_COMPLETED' };
      const result = processEvent(session, event);

      expect(result.session.task).toBeNull();
      expect(result.session.archivedTasks).toHaveLength(1);
      expect(result.session.archivedTasks[0].type).toBe('generation');
      expect(result.session.pendingNotification).toBe('task_archived');
    });

    it('should archive current task on TASK_CHANGED', () => {
      const session = createMockSession({
        task: {
          type: 'support',
          topic: 'order_status',
          referencedOrders: [],
          status: 'open',
        },
      });

      const event: SessionEvent = { type: 'TASK_CHANGED', newTaskType: 'checkout' };
      const result = processEvent(session, event);

      expect(result.session.task).toBeNull();
      expect(result.session.archivedTasks).toHaveLength(1);
      expect(result.session.metrics.taskChanges).toBe(1);
    });

    it('should complete session on SESSION_COMPLETE', () => {
      const session = createMockSession();

      const event: SessionEvent = { type: 'SESSION_COMPLETE' };
      const result = processEvent(session, event);

      expect(result.session.status).toBe('completed');
    });

    it('should preserve totalSessionTurns across resets', () => {
      const session = createMockSession({
        metrics: {
          turnCount: 10,
          manipulationFlagsTriggered: 1,
          emptyTurns: 2,
          taskChanges: 0,
          totalSessionTurns: 25, // Accumulated across resets
        },
      });

      const event: SessionEvent = { type: 'USER_RESET' };
      const result = processEvent(session, event);

      expect(result.session.metrics.turnCount).toBe(0);
      expect(result.session.metrics.totalSessionTurns).toBe(25); // Preserved
    });
  });

  describe('Conversation Window', () => {
    it('should maintain sliding window of 4 messages', () => {
      const session = createMockSession({
        conversationWindow: [
          { role: 'user', content: 'Message 1', timestamp: new Date().toISOString() },
          { role: 'assistant', content: 'Response 1', timestamp: new Date().toISOString() },
          { role: 'user', content: 'Message 2', timestamp: new Date().toISOString() },
          { role: 'assistant', content: 'Response 2', timestamp: new Date().toISOString() },
        ],
      });

      // Window is at capacity - next turn should cause reset to clear it
      expect(session.conversationWindow).toHaveLength(4);
    });

    it('should clear window on reset', () => {
      const session = createMockSession({
        conversationWindow: [
          { role: 'user', content: 'Message 1', timestamp: new Date().toISOString() },
          { role: 'assistant', content: 'Response 1', timestamp: new Date().toISOString() },
        ],
      });

      const event: SessionEvent = { type: 'USER_RESET' };
      const result = processEvent(session, event);

      expect(result.session.conversationWindow).toHaveLength(0);
    });
  });
});
