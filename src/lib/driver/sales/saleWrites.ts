import "server-only";
import { USE_MOCKS } from "@/lib/driver/useMocks";
import { mockSaleWrites } from "./mockSaleWrites";
import { realSaleWrites } from "./realSaleWrites";
import type { SaleWriteGateway } from "./saleWriteGateway";

/** The one switch between fake and real sale writes, like driverData.ts for reads. The actions import only this. */
export const saleWrites: SaleWriteGateway = USE_MOCKS ? mockSaleWrites : realSaleWrites;
