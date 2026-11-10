import { CashUpStatus, SaleStatus, Currency, PaymentMethod, RequestType, RequestStatus, type CashUpCardData } from '../../components/owner/cash-up-view-models';

export const mockCashUps: CashUpCardData[] = [
  // 1. الحالة الأولى: SUBMITTED مع وجود عجز USD (Gap USD منفی)
  {
    id: "a1000000-0000-4000-8000-000000000001",
    status: CashUpStatus.SUBMITTED,

    openedAt: new Date("2026-10-27T07:30:00Z"),
    countStartedAt: new Date("2026-10-27T13:30:00Z"),
    closedAt: new Date("2026-10-27T14:00:00Z"),
    approvedAt: null,
    voidedAt: null,
    updatedAt: new Date("2026-10-27T14:00:00Z"),

    floatUsd: 100,
    floatLbp: 15000000,
    referenceRate: 89500,

    expectedUsd: 450,
    expectedLbp: 25000000,
    countedUsd: 440,
    countedLbp: 25000000,
    gapUsd: -2.0, // تظهر كـ USD -2.00 أو LBP -10,000 حسب التصميم
    gapLbp: null,

    selfApproved: false,
    returnReason: null,
    voidReason: null,

    membership: {
      id: "m1000000-0000-4000-8000-000000000001",
      role: "STAFF",
      user: {
        id: "u1000000-0000-4000-8000-000000000001",
        fullName: "Mohamad",
      },
    },

    approvedBy: null,
    sales: [],
    cashOuts: [],
    countEntries: [],
    requests: [
      {
        id: "r1000000-0000-4000-8000-000000000001",
        type: RequestType.DELETE_SALE,
        status: RequestStatus.AWAITING_OWNER,
        reason: "Wrong entry",
        requestedBy: {
          role: "STAFF",
          user: { fullName: "Mohamad" },
        },
        saleId: null,
        sale: null,
        decisionReason: null,
        decidedBy: null,
        selfApproved: false,
        createdAt: new Date("2026-10-27T13:45:00Z"),
        decidedAt: null,
      },
    ],
  },

  // 2. الحالة الثانية: SUBMITTED تطابق تام (Matches)
  {
    id: "a1000000-0000-4000-8000-000000000002",
    status: CashUpStatus.SUBMITTED,

    openedAt: new Date("2026-10-28T08:00:00Z"),
    countStartedAt: new Date("2026-10-28T14:00:00Z"),
    closedAt: new Date("2026-10-28T14:30:00Z"),
    approvedAt: null,
    voidedAt: null,
    updatedAt: new Date("2026-10-28T14:30:00Z"),

    floatUsd: 100,
    floatLbp: 10000000,
    referenceRate: 89500,

    expectedUsd: 312, //312
    expectedLbp: 15000000,
    countedUsd: 300,
    countedLbp: 15000000,
    gapUsd: -12,
    gapLbp: 0,

    selfApproved: false,
    returnReason: null,
    voidReason: null,

    membership: {
      id: "m1000000-0000-4000-8000-000000000002",
      role: "STAFF",
      user: {
        id: "u1000000-0000-4000-8000-000000000002",
        fullName: "Rami",
      },
    },

    approvedBy: null,
    sales: [
      {
        id: "s1000000-0000-4000-8000-000000000001",
        saleNumber: 1,
        status: SaleStatus.DELIVERED,

        businessAmount: 50,
        deliveryFee: 5,
        tip: 2,
        discount: null,
        totalCollected: 57,

        currency: Currency.USD,
        method: PaymentMethod.CASH,

        changeGiven: null,
        changeCurrency: null,

        clientNumber: "70123456",
        note: null,

        mixedChange: false,
        amountDiffers: false,
        isEdited: false,
        deletionAwaiting: false,

        cancelReason: null,

        createdAt: new Date("2026-10-28T09:00:00Z"),
        deliveredAt: new Date("2026-10-28T09:30:00Z"),
        deletedAt: null,

        edits: [],
      },
      {
        id: "s1000000-0000-4000-8000-000000000002",
        saleNumber: 2,
        status: SaleStatus.DELIVERED,

        businessAmount: 70,
        deliveryFee: 5,
        tip: null,
        discount: null,
        totalCollected: 75,

        currency: Currency.USD,
        method: PaymentMethod.CASH,

        changeGiven: null,
        changeCurrency: null,

        clientNumber: "71123456",
        note: "Paid in cash",

        mixedChange: false,
        amountDiffers: false,
        isEdited: false,
        deletionAwaiting: false,

        cancelReason: null,

        createdAt: new Date("2026-10-28T10:00:00Z"),
        deliveredAt: new Date("2026-10-28T10:20:00Z"),
        deletedAt: null,

        edits: [],
      },
      {
        id: "s1000000-0000-4000-8000-000000000003",
        saleNumber: 3,
        status: SaleStatus.DELIVERED,

        businessAmount: 100,
        deliveryFee: 5,
        tip: 5,
        discount: null,
        totalCollected: 110,

        currency: Currency.USD,
        method: PaymentMethod.CASH,

        changeGiven: null,
        changeCurrency: null,

        clientNumber: "76123456",
        note: null,

        mixedChange: false,
        amountDiffers: false,
        isEdited: false,
        deletionAwaiting: false,

        cancelReason: null,

        createdAt: new Date("2026-10-28T11:00:00Z"),
        deliveredAt: new Date("2026-10-28T11:30:00Z"),
        deletedAt: null,

        edits: [],
      },
      {
        id: "s1000000-0000-4000-8000-000000000004",
        saleNumber: 4,
        status: SaleStatus.DELIVERED,

        businessAmount: 65,
        deliveryFee: 5,
        tip: null,
        discount: null,
        totalCollected: 70,

        currency: Currency.USD,
        method: PaymentMethod.CASH,

        changeGiven: null,
        changeCurrency: null,

        clientNumber: "79123456",
        note: null,

        mixedChange: false,
        amountDiffers: false,
        isEdited: false,
        deletionAwaiting: false,

        cancelReason: null,

        createdAt: new Date("2026-10-28T12:00:00Z"),
        deliveredAt: new Date("2026-10-28T12:25:00Z"),
        deletedAt: null,

        edits: [],
      },
    ],
    cashOuts: [],
    countEntries: [],
    requests: [],
  },

  // 3. الحالة الثالثة: OPEN (قيد العمل / In progress)
  {
    id: "a1000000-0000-4000-8000-000000000003",
    status: CashUpStatus.OPEN,

    openedAt: new Date("2026-10-28T07:00:00Z"),
    countStartedAt: null,
    closedAt: null,
    approvedAt: null,
    voidedAt: null,
    updatedAt: new Date("2026-10-28T07:00:00Z"),

    floatUsd: 100,
    floatLbp: 15000000,
    referenceRate: 89500,

    expectedUsd: null,
    expectedLbp: null,
    countedUsd: null,
    countedLbp: null,
    gapUsd: null,
    gapLbp: null,

    selfApproved: false,
    returnReason: null,
    voidReason: null,

    membership: {
      id: "m1000000-0000-4000-8000-000000000001",
      role: "STAFF",
      user: {
        id: "u1000000-0000-4000-8000-000000000001",
        fullName: "Mohamad",
      },
    },

    approvedBy: null,
    sales: [],
    cashOuts: [],
    countEntries: [],
    requests: [],
  },

  // 4. الحالة الرابعة: VOID أو RETURNED (مع السائق / With driver)
  {
    id: "a1000000-0000-4000-8000-000000000004",
    status: CashUpStatus.VOID,

    openedAt: new Date("2026-10-26T08:00:00Z"),
    countStartedAt: new Date("2026-10-26T15:00:00Z"),
    closedAt: new Date("2026-10-26T15:30:00Z"),
    approvedAt: null,
    voidedAt: new Date("2026-10-26T16:00:00Z"),
    updatedAt: new Date("2026-10-26T16:00:00Z"),

    floatUsd: 100,
    floatLbp: 10000000,
    referenceRate: 89500,

    expectedUsd: 250,
    expectedLbp: 12000000,
    countedUsd: 200,
    countedLbp: 12000000,
    gapUsd: -50,
    gapLbp: 0,

    selfApproved: false,
    returnReason: "Discrepancy in collection amounts, returned to driver.",
    voidReason: "Returned for correction",

    membership: {
      id: "m1000000-0000-4000-8000-000000000001",
      role: "STAFF",
      user: {
        id: "u1000000-0000-4000-8000-000000000001",
        fullName: "Mohamad",
      },
    },

    approvedBy: null,
    sales: [],
    cashOuts: [],
    countEntries: [],
    requests: [],
  },

  // 5. الحالة الخامسة: APPROVED مطابق (Matches)
  {
    id: "a1000000-0000-4000-8000-000000000005",
    status: CashUpStatus.APPROVED,

    openedAt: new Date("2026-10-25T08:00:00Z"),
    countStartedAt: new Date("2026-10-25T14:00:00Z"),
    closedAt: new Date("2026-10-25T14:30:00Z"),
    approvedAt: new Date("2026-10-25T15:00:00Z"),
    voidedAt: null,
    updatedAt: new Date("2026-10-25T15:00:00Z"),

    floatUsd: 100,
    floatLbp: 15000000,
    referenceRate: 89500,

    expectedUsd: 500,
    expectedLbp: 20000000,
    countedUsd: 500,
    countedLbp: 20000000,
    gapUsd: 0,
    gapLbp: 0,

    selfApproved: false,
    returnReason: null,
    voidReason: null,

    membership: {
      id: "m1000000-0000-4000-8000-000000000002",
      role: "STAFF",
      user: {
        id: "u1000000-0000-4000-8000-000000000002",
        fullName: "Rami",
      },
    },

    approvedBy: {
      id: "m1000000-0000-4000-8000-000000000009",
      role: "OWNER",
      user: { fullName: "Admin Owner" },
    },

    sales: [],
    cashOuts: [],
    countEntries: [],
    requests: [],
  },

  // 6. الحالة السادسة: APPROVED مع Self-approved وعجز USD
  {
    id: "a1000000-0000-4000-8000-000000000006",
    status: CashUpStatus.APPROVED,

    openedAt: new Date("2026-10-24T08:00:00Z"),
    countStartedAt: new Date("2026-10-24T14:00:00Z"),
    closedAt: new Date("2026-10-24T14:30:00Z"),
    approvedAt: new Date("2026-10-24T14:35:00Z"),
    voidedAt: null,
    updatedAt: new Date("2026-10-24T14:35:00Z"),

    floatUsd: 100,
    floatLbp: 15000000,
    referenceRate: 89500,

    expectedUsd: 350,
    expectedLbp: 10000000,
    countedUsd: 348,
    countedLbp: 10000000,
    gapUsd: -2.0,
    gapLbp: 0,

    selfApproved: false,
    returnReason: null,
    voidReason: null,

    membership: {
      id: "m1000000-0000-4000-8000-000000000003",
      role: "OWNER",
      user: {
        id: "u1000000-0000-4000-8000-000000000003",
        fullName: "Ali",
      },
    },

    approvedBy: null,
    sales: [],
    cashOuts: [],
    countEntries: [],
    requests: [],
  },
];
