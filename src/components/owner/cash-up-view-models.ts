/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

export const AuthProvider = {
  LOCAL: "LOCAL",
  GOOGLE: "GOOGLE",
} as const;
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];

export const MembershipRole = {
  OWNER: "OWNER",
  STAFF: "STAFF",
} as const;
export type MembershipRole =
  (typeof MembershipRole)[keyof typeof MembershipRole];

export const CashUpStatus = {
  OPEN: "OPEN",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  VOID: "VOID",
} as const;
export type CashUpStatus = (typeof CashUpStatus)[keyof typeof CashUpStatus];

export const SaleStatus = {
  TO_DELIVER: "TO_DELIVER",
  DELIVERED: "DELIVERED",
  DELETED: "DELETED",
} as const;
export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus];

export const Currency = {
  USD: "USD",
  LBP: "LBP",
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export const PaymentMethod = {
  CASH: "CASH",
  WHISH: "WHISH",
  OMT: "OMT",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const RequestType = {
  DELETE_SALE: "DELETE_SALE",
  VOID_CASHUP: "VOID_CASHUP",
} as const;
export type RequestType = (typeof RequestType)[keyof typeof RequestType];

export const RequestStatus = {
  AWAITING_OWNER: "AWAITING_OWNER",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const AmendmentStatus = {
  AWAITING_APPROVAL: "AWAITING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type AmendmentStatus =
  (typeof AmendmentStatus)[keyof typeof AmendmentStatus];

export const AmendmentChangeKind = {
  SALE_FIELD: "SALE_FIELD",
  COUNT_ENTRY: "COUNT_ENTRY",
} as const;
export type AmendmentChangeKind =
  (typeof AmendmentChangeKind)[keyof typeof AmendmentChangeKind];

/* -------------------------------------------------------------------------- */
/* Shared UI types                                                             */
/* -------------------------------------------------------------------------- */

export interface UserSummary {
  id?: string;
  fullName: string;
  email?: string;
}

export interface MembershipSummary {
  id?: string;
  role?: MembershipRole;
  user: UserSummary;
}

/* -------------------------------------------------------------------------- */
/* Sale                                                                        */
/* -------------------------------------------------------------------------- */

export interface SaleEditData {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  editedBy: UserSummary;
}

export interface SaleData {
  id: string;
  saleNumber: number;
  status: SaleStatus;

  businessAmount: number;
  deliveryFee: number;
  tip: number | null;
  discount: number | null;
  totalCollected: number | null;

  currency: Currency;
  method: PaymentMethod | null;

  changeGiven: number | null;
  changeCurrency: Currency | null;

  clientNumber: string | null;
  note: string | null;

  mixedChange: boolean;
  amountDiffers: boolean;
  isEdited: boolean;
  deletionAwaiting: boolean;

  cancelReason: string | null;

  createdAt: Date;
  deliveredAt: Date | null;
  deletedAt: Date | null;

  edits: SaleEditData[];
}

/* -------------------------------------------------------------------------- */
/* Requests                                                                    */
/* -------------------------------------------------------------------------- */

export interface RequestData {
  id: string;
  type: RequestType;
  status: RequestStatus;

  reason: string;

  requestedBy: MembershipSummary;

  saleId: string | null;
  sale: Pick<
    SaleData,
    "id" | "saleNumber" | "totalCollected" | "currency"
  > | null;

  decisionReason: string | null;
  decidedBy: MembershipSummary | null;
  selfApproved: boolean;

  createdAt: Date;
  decidedAt: Date | null;
}

/* -------------------------------------------------------------------------- */
/* Cash outs and count entries                                                 */
/* -------------------------------------------------------------------------- */

export interface CashOutData {
  id: string;
  amount: number;
  currency: Currency;
  reason: string;
  createdAt: Date;
}

export interface CountEntryData {
  id: string;
  currency: Currency;
  denomination: number;
  quantity: number;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* Cash-up                                                                     */
/* -------------------------------------------------------------------------- */

export interface CashUpCardData {
  id: string;
  status: CashUpStatus;

  openedAt: Date;
  countStartedAt: Date | null;
  closedAt: Date | null;
  approvedAt: Date | null;
  voidedAt: Date | null;
  updatedAt: Date;

  floatUsd: number;
  floatLbp: number;
  referenceRate: number | null;

  expectedUsd: number | null;
  expectedLbp: number | null;
  countedUsd: number | null;
  countedLbp: number | null;
  gapUsd: number | null;
  gapLbp: number | null;

  selfApproved: boolean;
  returnReason: string | null;
  voidReason: string | null;

  membership: MembershipSummary;
  approvedBy: MembershipSummary | null;

  sales: SaleData[];
  cashOuts: CashOutData[];
  countEntries: CountEntryData[];
  requests: RequestData[];
}
