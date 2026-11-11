import "server-only";
import { USE_MOCKS } from "@/lib/driver/useMocks";
import type { CashOutWriteGateway } from "./cashOutWriteGateway";
import { mockCashOutWrites } from "./mockCashOutWrites";
import { realCashOutWrites } from "./realCashOutWrites";

/** The one switch between fake and real cash-out writes, like saleWrites.ts. The actions import only this. */
export const cashOutWrites: CashOutWriteGateway = USE_MOCKS ? mockCashOutWrites : realCashOutWrites;
