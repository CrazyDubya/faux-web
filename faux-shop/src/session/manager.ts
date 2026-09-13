// Session manager - persistence and lifecycle
import type { Session, SessionMetrics, ConversationTurn } from '../types/session';
import type { Env, SessionStatus } from '../types';
import { SESSION_CONSTRAINTS } from '../types';
import { processEvent, shouldReset, type SessionEvent } from './state-machine';

export class SessionManager {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  async getOrCreateSession(sessionId: string | undefined, customerId: string): Promise<Session> {
    if (sessionId) {
      const existing = await this.getSession(sessionId);
      if (existing && existing.customerId === customerId) {
        // Check for idle timeout on retrieval
        const resetCheck = shouldReset(existing);
        if (resetCheck.reset) {
          const { session } = processEvent(existing, { type: 'IDLE_TIMEOUT' });
          await this.saveSession(session);
          return session;
        }
        return existing;
      }
    }
    return this.createSession(customerId);
  }

  async getSession(id: string): Promise<Session | null> {
    try {
      const result = await this.db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(id)
        .first<{
          id: string;
          customer_id: string;
          created_at: string;
          last_activity: string;
          status: SessionStatus;
          turn_count: number;
          manipulation_flags: number;
          task_state: string | null;
          conversation_window: string | null;
          archived_tasks: string | null;
          pending_notification: string | null;
          empty_turns: number;
          task_changes: number;
          total_session_turns: number;
        }>();

      if (!result) return null;

      return {
        id: result.id,
        customerId: result.customer_id,
        createdAt: result.created_at,
        lastActivity: result.last_activity,
        status: result.status,
        metrics: {
          turnCount: result.turn_count,
          manipulationFlagsTriggered: result.manipulation_flags,
          emptyTurns: result.empty_turns || 0,
          taskChanges: result.task_changes || 0,
          totalSessionTurns: result.total_session_turns || 0,
        },
        task: result.task_state ? JSON.parse(result.task_state) : null,
        conversationWindow: result.conversation_window ? JSON.parse(result.conversation_window) : [],
        archivedTasks: result.archived_tasks ? JSON.parse(result.archived_tasks) : [],
        pendingNotification: result.pending_notification as Session['pendingNotification'],
      };
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }

  async createSession(customerId: string): Promise<Session> {
    const now = new Date().toISOString();
    const session: Session = {
      id: crypto.randomUUID(),
      customerId,
      createdAt: now,
      lastActivity: now,
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
    };

    await this.saveSession(session);
    return session;
  }

  async saveSession(session: Session): Promise<void> {
    try {
      await this.db
        .prepare(`
          INSERT OR REPLACE INTO sessions (
            id, customer_id, created_at, last_activity, status,
            turn_count, manipulation_flags, empty_turns, task_changes,
            total_session_turns, task_state, conversation_window,
            archived_tasks, pending_notification
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          session.id,
          session.customerId,
          session.createdAt,
          session.lastActivity,
          session.status,
          session.metrics.turnCount,
          session.metrics.manipulationFlagsTriggered,
          session.metrics.emptyTurns,
          session.metrics.taskChanges,
          session.metrics.totalSessionTurns,
          session.task ? JSON.stringify(session.task) : null,
          JSON.stringify(session.conversationWindow),
          JSON.stringify(session.archivedTasks),
          session.pendingNotification
        )
        .run();
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  async addToConversationWindow(session: Session, turn: ConversationTurn): Promise<Session> {
    const window = [...session.conversationWindow, turn];

    // Maintain sliding window of last 4 messages (2 exchanges)
    while (window.length > SESSION_CONSTRAINTS.CONVERSATION_WINDOW_SIZE) {
      window.shift();
    }

    const updated: Session = {
      ...session,
      conversationWindow: window,
      lastActivity: new Date().toISOString(),
    };

    await this.saveSession(updated);
    return updated;
  }

  async processSessionEvent(session: Session, event: SessionEvent): Promise<{ session: Session; didReset: boolean; notification?: string }> {
    const result = processEvent(session, event);
    await this.saveSession(result.session);
    return result;
  }

  async clearNotification(session: Session): Promise<Session> {
    const updated: Session = {
      ...session,
      pendingNotification: null,
    };
    await this.saveSession(updated);
    return updated;
  }
}
