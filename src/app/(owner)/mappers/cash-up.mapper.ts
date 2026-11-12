//cash-up mapper from CashUpHistoryRowDto , ...  to CashUpCardData

/*
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

  // من هون لتحت منشوفن بعد شوي 
  membership: MembershipSummary;
  approvedBy: MembershipSummary | null;

  sales: SaleData[]; ? mapper done : mapSaleDtoToSaleData(dto: SaleDto): SaleData
  cashOuts: CashOutData[]; 
  countEntries: CountEntryData[];
  requests: RequestData[];
}
*/
