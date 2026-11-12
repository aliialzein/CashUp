import { CashUpStatus, SaleStatus, Currency, PaymentMethod, RequestType, RequestStatus, type CashUpCardData } from '../../components/owner/cash-up-view-models';

export const mockCashUps: CashUpCardData[] = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    status: CashUpStatus.SUBMITTED,

    openedAt: new Date("2026-11-02T07:30:00Z"),
    countStartedAt: new Date("2026-11-02T13:30:00Z"),
    closedAt: new Date("2026-11-02T14:00:00Z"),
    approvedAt: null,
    voidedAt: null,
    updatedAt: new Date("2026-11-02T14:00:00Z"),

    floatUsd: 100,
    floatLbp: 15000000,
    referenceRate: 89500,

    expectedUsd: 450,
    expectedLbp: 25000000,
    countedUsd: 440,
    countedLbp: 25000000,
    gapUsd: -10,
    gapLbp: 0,

    selfApproved: false,
    returnReason: null,
    voidReason: null,

    membership: {
      id: "m1000000-0000-4000-8000-000000000001",
      role: "STAFF",
      user: {
        id: "u1000000-0000-4000-8000-000000000001",
        fullName: "Ahmad Khalil",
      },
    },

    approvedBy: null,

    sales: [
      {
        id: "s1000000-0000-4000-8000-000000000001",
        saleNumber: 1,
        status: SaleStatus.DELIVERED,

        businessAmount: 100,
        deliveryFee: 5,
        tip: 3,
        discount: 0,
        totalCollected: 108,

        currency: Currency.USD,
        method: PaymentMethod.CASH,

        changeGiven: 0,
        changeCurrency: Currency.USD,

        clientNumber: "03XXXXXX",
        note: "First floor",

        mixedChange: false,
        amountDiffers: false,
        isEdited: false,
        deletionAwaiting: false,

        cancelReason: null,

        createdAt: new Date("2026-11-02T08:15:00Z"),
        deliveredAt: new Date("2026-11-02T08:45:00Z"),
        deletedAt: null,

        edits: [],
      },

      {
        id: "s1000000-0000-4000-8000-000000000002",
        saleNumber: 2,
        status: SaleStatus.DELIVERED,

        businessAmount: 200,
        deliveryFee: 5,
        tip: null,
        discount: 10,
        totalCollected: 195,

        currency: Currency.USD,
        method: PaymentMethod.WHISH,

        changeGiven: null,
        changeCurrency: null,

        clientNumber: "71XXXXXX",
        note: null,

        mixedChange: false,
        amountDiffers: true,
        isEdited: true,
        deletionAwaiting: false,

        cancelReason: null,

        createdAt: new Date("2026-11-02T09:30:00Z"),
        deliveredAt: new Date("2026-11-02T10:00:00Z"),
        deletedAt: null,

        edits: [
          {
            id: "se1000000-0000-4000-8000-000000000001",
            field: "deliveryFee",
            oldValue: "10",
            newValue: "5",
            createdAt: new Date("2026-11-02T09:45:00Z"),
            editedBy: {
              fullName: "Ahmad Khalil",
            },
          },
        ],
      },

      {
        id: "s1000000-0000-4000-8000-000000000003",
        saleNumber: 3,
        status: SaleStatus.TO_DELIVER,

        businessAmount: 15000000,
        deliveryFee: 500000,
        tip: null,
        discount: null,
        totalCollected: null,

        currency: Currency.LBP,
        method: null,

        changeGiven: null,
        changeCurrency: null,

        clientNumber: "70XXXXXX",
        note: "Pending delivery",

        mixedChange: false,
        amountDiffers: false,
        isEdited: false,
        deletionAwaiting: false,

        cancelReason: null,

        createdAt: new Date("2026-11-02T11:00:00Z"),
        deliveredAt: null,
        deletedAt: null,

        edits: [],
      },
    ],

    cashOuts: [
      {
        id: "co1000000-0000-4000-8000-000000000001",
        amount: 20,
        currency: Currency.USD,
        reason: "Transportation expense",
        createdAt: new Date("2026-11-02T12:00:00Z"),
      },
    ],

    countEntries: [
      {
        id: "ce1000000-0000-4000-8000-000000000001",
        currency: Currency.USD,
        denomination: 100,
        quantity: 4,
        updatedAt: new Date("2026-11-02T13:50:00Z"),
      },
      {
        id: "ce1000000-0000-4000-8000-000000000002",
        currency: Currency.USD,
        denomination: 20,
        quantity: 2,
        updatedAt: new Date("2026-11-02T13:50:00Z"),
      },
      {
        id: "ce1000000-0000-4000-8000-000000000003",
        currency: Currency.LBP,
        denomination: 1000000,
        quantity: 25,
        updatedAt: new Date("2026-11-02T13:50:00Z"),
      },
    ],

    requests: [
      {
        id: "r1000000-0000-4000-8000-000000000001",
        type: RequestType.DELETE_SALE,
        status: RequestStatus.AWAITING_OWNER,

        reason: "Sale was entered by mistake.",

        requestedBy: {
          id: "m1000000-0000-4000-8000-000000000001",
          role: "STAFF",
          user: {
            fullName: "Ahmad Khalil",
          },
        },

        saleId: "s1000000-0000-4000-8000-000000000002",
        sale: {
          id: "s1000000-0000-4000-8000-000000000002",
          saleNumber: 2,
          totalCollected: 195,
          currency: Currency.USD,
        },

        decisionReason: null,
        decidedBy: null,
        selfApproved: false,

        createdAt: new Date("2026-11-02T13:45:00Z"),
        decidedAt: null,
      },
    ],
  },
];
