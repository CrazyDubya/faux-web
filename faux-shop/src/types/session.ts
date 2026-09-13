// Session and task state types
import type { UUID, ISODateTime, SessionStatus, TaskType, ProductType } from './index';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: ISODateTime;
}

export interface SessionMetrics {
  turnCount: number;
  manipulationFlagsTriggered: number;
  emptyTurns: number;
  taskChanges: number;
  totalSessionTurns: number;
}

export interface ImageVersion {
  id: UUID;
  createdAt: ISODateTime;
  promptDelta: string;
  imageRef: string;
  status: 'generating' | 'complete' | 'failed' | 'flagged';
  selected: boolean;
}

export interface GenerationTask {
  type: 'generation';
  originalPrompt: string;
  versions: ImageVersion[];
  currentVersionId: UUID | null;
  generationCount: number;
}

export interface SupportTask {
  type: 'support';
  topic: string;
  referencedOrders: UUID[];
  status: 'open' | 'pending_info' | 'escalated' | 'resolved';
  escalationReason?: string;
  resolutionCode?: string;
}

export interface CartItem {
  id: UUID;
  productType: ProductType;
  imageVersionId: UUID;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface AppliedDiscount {
  code: string;
  source: 'promotion' | 'tier_benefit' | 'system';
  type: 'percentage' | 'fixed' | 'shipping';
  amount: number;
  description: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CheckoutTask {
  type: 'checkout';
  cartItems: CartItem[];
  appliedDiscounts: AppliedDiscount[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  shippingAddress?: Address;
}

export type Task = GenerationTask | SupportTask | CheckoutTask | null;

export interface ArchivedTask {
  id: UUID;
  type: TaskType;
  archivedAt: ISODateTime;
  summary: Record<string, unknown>;
}

export type PendingNotification = 'session_reset' | 'task_archived' | 'escalation_pending' | null;

export interface Session {
  id: UUID;
  customerId: UUID;
  createdAt: ISODateTime;
  lastActivity: ISODateTime;
  status: SessionStatus;
  metrics: SessionMetrics;
  task: Task;
  conversationWindow: ConversationTurn[];
  archivedTasks: ArchivedTask[];
  pendingNotification: PendingNotification;
}
