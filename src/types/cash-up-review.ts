export interface MoneyPair {
  usd: number;
  lbp: number;
}

export interface CashSummaryData {
  float: MoneyPair;
  cashCollected: MoneyPair;
  changeGiven: MoneyPair;
  cashOuts: MoneyPair;
  expected: MoneyPair;
  counted: MoneyPair;
  gap: MoneyPair;
}

export interface CashUpReviewData {
  id: string;
  employeeName: string;
  openedAt: Date;
  submittedAt: Date;
  countingDuration: number;
  summary: CashSummaryData;
  flags: string[];
  pendingRequests: number;
}
