// Session state machine - handles transitions and reset logic
import type { Session, SessionMetrics, Task, ArchivedTask, ConversationTurn } from '../types/session';
import type { SessionStatus } from '../types';
import { SESSION_CONSTRAINTS } from '../types';

export type SessionEvent =
  | { type: 'MESSAGE_RECEIVED' }
  | { type: 'TASK_STARTED'; taskType: 'generation' | 'support' | 'checkout' }
  | { type: 'TASK_COMPLETED' }
  | { type: 'TASK_CHANGED'; newTaskType: 'generation' | 'support' | 'checkout' }
  | { type: 'MANIPULATION_DETECTED' }
  | { type: 'IDLE_TIMEOUT' }
  | { type: 'USER_RESET' }
  | { type: 'SESSION_COMPLETE' };

export interface SessionTransition {
  session: Session;
  didReset: boolean;
  notification?: string;
}

export function shouldReset(session: Session): { reset: boolean; reason?: string } {
  // Check turn limit
  if (session.metrics.turnCount >= SESSION_CONSTRAINTS.TURN_LIMIT) {
    return { reset: true, reason: 'turn_limit_reached' };
  }

  // Check idle timeout
  const lastActivity = new Date(session.lastActivity).getTime();
  if (Date.now() - lastActivity > SESSION_CONSTRAINTS.IDLE_LIMIT_MS) {
    return { reset: true, reason: 'idle_timeout' };
  }

  return { reset: false };
}

export function processEvent(session: Session, event: SessionEvent): SessionTransition {
  const now = new Date().toISOString();

  switch (event.type) {
    case 'MESSAGE_RECEIVED': {
      const resetCheck = shouldReset(session);
      if (resetCheck.reset) {
        return performSoftReset(session, now, resetCheck.reason);
      }

      return {
        session: {
          ...session,
          lastActivity: now,
          metrics: {
            ...session.metrics,
            turnCount: session.metrics.turnCount + 1,
            totalSessionTurns: session.metrics.totalSessionTurns + 1,
          },
        },
        didReset: false,
      };
    }

    case 'TASK_STARTED': {
      return {
        session: {
          ...session,
          lastActivity: now,
        },
        didReset: false,
      };
    }

    case 'TASK_CHANGED': {
      // Archive current task if exists
      const archived = session.task ? archiveTask(session.task, now) : null;

      return {
        session: {
          ...session,
          lastActivity: now,
          task: null,
          archivedTasks: archived
            ? [...session.archivedTasks, archived]
            : session.archivedTasks,
          metrics: {
            ...session.metrics,
            taskChanges: session.metrics.taskChanges + 1,
          },
          pendingNotification: 'task_archived',
        },
        didReset: false,
        notification: 'Previous task has been saved. Starting new task.',
      };
    }

    case 'TASK_COMPLETED': {
      const archived = session.task ? archiveTask(session.task, now) : null;

      return {
        session: {
          ...session,
          lastActivity: now,
          task: null,
          archivedTasks: archived
            ? [...session.archivedTasks, archived]
            : session.archivedTasks,
          pendingNotification: 'task_archived',
        },
        didReset: false,
        notification: 'Task completed and saved.',
      };
    }

    case 'MANIPULATION_DETECTED': {
      return {
        session: {
          ...session,
          lastActivity: now,
          metrics: {
            ...session.metrics,
            manipulationFlagsTriggered: session.metrics.manipulationFlagsTriggered + 1,
          },
        },
        didReset: false,
      };
    }

    case 'IDLE_TIMEOUT':
    case 'USER_RESET': {
      return performSoftReset(session, now, event.type);
    }

    case 'SESSION_COMPLETE': {
      return {
        session: {
          ...session,
          status: 'completed',
          lastActivity: now,
        },
        didReset: false,
      };
    }

    default:
      return { session, didReset: false };
  }
}

function performSoftReset(session: Session, timestamp: string, reason?: string): SessionTransition {
  // Archive current task if exists
  const archived = session.task ? archiveTask(session.task, timestamp) : null;

  return {
    session: {
      ...session,
      lastActivity: timestamp,
      status: 'reset',
      metrics: {
        ...session.metrics,
        turnCount: 0,
        manipulationFlagsTriggered: 0,
        emptyTurns: 0,
        // totalSessionTurns persists across resets
      },
      task: null,
      conversationWindow: [], // Clear conversation
      archivedTasks: archived
        ? [...session.archivedTasks, archived]
        : session.archivedTasks,
      pendingNotification: 'session_reset',
    },
    didReset: true,
    notification: getResetMessage(reason),
  };
}

function archiveTask(task: Task, timestamp: string): ArchivedTask | null {
  if (!task) return null;

  const summary: Record<string, unknown> = { type: task.type };

  switch (task.type) {
    case 'generation':
      summary.originalPrompt = task.originalPrompt.slice(0, 100);
      summary.versionsCount = task.versions.length;
      summary.hasSelectedVersion = task.versions.some(v => v.selected);
      break;
    case 'support':
      summary.topic = task.topic;
      summary.status = task.status;
      summary.referencedOrdersCount = task.referencedOrders.length;
      break;
    case 'checkout':
      summary.itemCount = task.cartItems.length;
      summary.total = task.total;
      summary.paymentStatus = task.paymentStatus;
      break;
  }

  return {
    id: crypto.randomUUID(),
    type: task.type,
    archivedAt: timestamp,
    summary,
  };
}

function getResetMessage(reason?: string): string {
  switch (reason) {
    case 'turn_limit_reached':
      return "I've saved our progress. Let me know how I can help you next.";
    case 'idle_timeout':
      return "Welcome back! I've saved your previous work. How can I help you today?";
    case 'USER_RESET':
      return "I've reset our conversation. Your previous work is saved. What would you like to do?";
    default:
      return "I've saved our progress. How can I help you?";
  }
}
