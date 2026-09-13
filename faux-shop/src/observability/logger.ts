// Structured logging for observability
import type { Env } from '../types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'alert';
export type LogCategory = 'business' | 'security' | 'system' | 'audit';

export interface LogEvent {
  timestamp: string;
  requestId: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  sessionId?: string;
  customerId?: string;
  agentId?: string;
  action?: string;
  decision?: string;
  confidence?: number;
  flags?: string[];
  constraintsChecked?: string[];
  outcome?: 'success' | 'failure' | 'escalated' | 'blocked' | 'modified';
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export class Logger {
  private requestId: string;
  private sessionId?: string;
  private customerId?: string;
  private db?: D1Database;

  constructor(requestId?: string) {
    this.requestId = requestId || crypto.randomUUID();
  }

  setContext(context: { sessionId?: string; customerId?: string; db?: D1Database }): void {
    this.sessionId = context.sessionId;
    this.customerId = context.customerId;
    this.db = context.db;
  }

  private log(level: LogLevel, category: LogCategory, message: string, metadata?: Record<string, unknown>): void {
    const event: LogEvent = {
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      level,
      category,
      message,
      sessionId: this.sessionId,
      customerId: this.customerId ? this.hashCustomerId(this.customerId) : undefined,
      ...metadata,
    };

    // Console output in structured format
    console.log(JSON.stringify(event));

    // Persist audit logs
    if (category === 'audit' || category === 'security') {
      this.persistLog(event).catch(err => console.error('Failed to persist log:', err));
    }
  }

  private hashCustomerId(id: string): string {
    // Simple hash for PII protection in logs
    return `cust_${id.slice(0, 8)}`;
  }

  private async persistLog(event: LogEvent): Promise<void> {
    if (!this.db) return;

    try {
      await this.db
        .prepare(`
          INSERT INTO audit_log (id, timestamp, request_id, event_type, action, metadata)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(
          crypto.randomUUID(),
          event.timestamp,
          event.requestId,
          `${event.category}:${event.level}`,
          event.message,
          JSON.stringify(event.metadata || {})
        )
        .run();
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  // Business logging
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', 'business', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', 'business', message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log('error', 'business', message, metadata);
  }

  // Security logging
  security(event: string, metadata?: Record<string, unknown>): void {
    this.log('warn', 'security', event, metadata);
  }

  securityAlert(event: string, metadata?: Record<string, unknown>): void {
    this.log('alert', 'security', event, metadata);
  }

  // Audit logging
  audit(action: string, metadata?: Record<string, unknown>): void {
    this.log('info', 'audit', action, metadata);
  }

  // System logging
  system(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', 'system', message, metadata);
  }

  // Request lifecycle
  requestStart(method: string, path: string): void {
    this.log('info', 'system', `Request started: ${method} ${path}`, { method, path });
  }

  requestEnd(statusCode: number, durationMs: number): void {
    this.log('info', 'system', `Request completed: ${statusCode}`, { statusCode, durationMs });
  }

  // Agent decisions
  agentDecision(agentId: string, decision: string, confidence: number, metadata?: Record<string, unknown>): void {
    this.log('info', 'business', `Agent decision: ${decision}`, {
      agentId,
      decision,
      confidence,
      ...metadata,
    });
  }

  // Constraint checking
  constraintCheck(constraint: string, passed: boolean, metadata?: Record<string, unknown>): void {
    const level = passed ? 'info' : 'warn';
    this.log(level, 'audit', `Constraint ${constraint}: ${passed ? 'PASS' : 'FAIL'}`, {
      constraint,
      passed,
      ...metadata,
    });
  }

  // Manipulation detection
  manipulationDetected(flags: string[], riskScore: number): void {
    this.log('warn', 'security', 'Manipulation patterns detected', {
      flags,
      riskScore,
      outcome: 'flagged',
    });
  }

  // Escalation
  escalation(reason: string, metadata?: Record<string, unknown>): void {
    this.log('info', 'business', `Escalation triggered: ${reason}`, {
      outcome: 'escalated',
      ...metadata,
    });
  }

  getRequestId(): string {
    return this.requestId;
  }
}
