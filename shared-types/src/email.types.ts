export type EmailDirection = 'OUTBOUND' | 'INBOUND';

export type EmailProcessedStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ERROR';

export type EmailType =
  | 'BUDGET_APPROVAL'
  | 'ORDER_CONFIRMATION'
  | 'BUDGET_DECISION_CONFIRMATION'
  | 'READY_FOR_PICKUP'
  | 'INBOUND_REPLY'
  | 'INBOUND_OTHER';

export type EmailDecision = 'APPROVED' | 'REJECTED' | 'UNKNOWN';

export interface EmailLog {
  id: string;
  orderId?: string;
  direction: EmailDirection;
  type: EmailType;
  toAddress: string;
  fromAddress: string;
  subject: string;
  processedStatus: EmailProcessedStatus;
  createdAt: Date | string;
}

export interface EmailOrderItem {
  productName: string;
  quantity: number;
  price: number;
  specifications: EmailSpecification[];
}

export interface EmailSpecification {
  name: string;
  value: string;
}

export interface BudgetApprovalEmailData {
  orderId: string;
  orderNumber: string;
  requesterName: string;
  budgetOfficerEmail: string;
  items: EmailOrderItem[];
  totalPrice: number;
  approvalUrl: string;
}

export interface OrderConfirmationEmailData {
  orderId: string;
  orderNumber: string;
  requesterEmail: string;
  trackingUrl: string;
}

export interface ReadyForPickupEmailData {
  orderId: string;
  orderNumber: string;
  requesterEmail: string;
  pickupInstructions: string;
  trackingUrl: string;
}

export interface ParsedInboundEmail {
  senderEmail: string;
  subject: string;
  body: string;
  cleanedBody: string;
  orderNumber?: string;
  decision: EmailDecision;
}

export interface BudgetDecisionConfirmationEmailData {
  orderId: string;
  orderNumber: string;
  budgetOfficerEmail: string;
  decision: 'APPROVED' | 'REJECTED';
  inReplyTo?: string;
  references?: string[];
  originalSubject?: string;
}
