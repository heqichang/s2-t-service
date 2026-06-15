export type UserRole = 'CUSTOMER' | 'AGENT' | 'ADMIN';
export type AgentStatus = 'ONLINE' | 'BUSY' | 'OFFLINE';
export type TicketStatus = 'PENDING' | 'PROCESSING' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'TECHNICAL' | 'PRE_SALES' | 'COMPLAINT';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
export type NotificationType =
  | 'NEW_TICKET'
  | 'CUSTOMER_REPLY'
  | 'STATUS_CHANGE'
  | 'AGENT_REPLY'
  | 'TICKET_ASSIGNED'
  | 'TICKET_MERGED';

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  agent?: AgentInfo;
}

export interface AgentInfo {
  id: number;
  status: AgentStatus;
  team?: { id: number; name: string };
}

export interface Agent {
  id: number;
  userId: number;
  status: AgentStatus;
  team?: { id: number; name: string };
  user: { id: number; name: string; email: string; avatar?: string };
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  _count?: { agents: number };
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  customerId: number;
  agentId: number | null;
  customer: { id: number; name: string; email: string; phone?: string };
  agent?: {
    id: number;
    user: { id: number; name: string; email: string; avatar?: string };
    team?: { id: number; name: string };
  } | null;
  tags: { tag: Tag }[];
  messages?: Message[];
  attachments?: Attachment[];
  rating?: TicketRating;
  mergedTo?: { id: number; title: string; status: TicketStatus };
  mergedFrom?: { id: number; title: string; status: TicketStatus }[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  _count?: { messages: number };
}

export interface Message {
  id: number;
  ticketId: number;
  content: string;
  type: MessageType;
  userId: number | null;
  agentId: number | null;
  isInternal: boolean;
  user?: { id: number; name: string; email: string; avatar?: string };
  agent?: { user: { id: number; name: string; email: string; avatar?: string } };
  createdAt: string;
}

export interface Attachment {
  id: number;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  content: string;
  ticketId: number | null;
  read: boolean;
  createdAt: string;
}

export interface TicketRating {
  id: number;
  ticketId: number;
  userId: number;
  rating: number;
  comment?: string;
  createdAt: string;
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  WAITING_CUSTOMER: '等待客户',
  RESOLVED: '已解决',
  CLOSED: '已关闭',
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  PENDING: 'orange',
  PROCESSING: 'blue',
  WAITING_CUSTOMER: 'cyan',
  RESOLVED: 'green',
  CLOSED: 'default',
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  TECHNICAL: '技术问题',
  PRE_SALES: '售前咨询',
  COMPLAINT: '投诉建议',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '紧急',
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  LOW: 'default',
  MEDIUM: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
};

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  ONLINE: '在线',
  BUSY: '忙碌',
  OFFLINE: '离线',
};

export const AGENT_STATUS_COLORS: Record<AgentStatus, string> = {
  ONLINE: 'success',
  BUSY: 'warning',
  OFFLINE: 'default',
};
