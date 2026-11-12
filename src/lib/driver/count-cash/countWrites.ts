import "server-only";
import { USE_MOCKS } from "@/lib/driver/useMocks";
import type { CountWriteGateway } from "./countWriteGateway";
import { mockCountWrites } from "./mockCountWrites";
import { realCountWrites } from "./realCountWrites";

/** The one switch between fake and real count writes, like saleWrites.ts. The actions import only this. */
export const countWrites: CountWriteGateway = USE_MOCKS ? mockCountWrites : realCountWrites;
