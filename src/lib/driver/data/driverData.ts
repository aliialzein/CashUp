import "server-only";
import { USE_MOCKS } from "@/lib/driver/useMocks";
import type { DriverDataSource } from "./driverDataSource";
import { mockDriverData } from "./mockDriverData";
import { realDriverData } from "./realDriverData";

/** The one switch between fake and real data. Pages import only this, never the mock folder. */
export const driverData: DriverDataSource = USE_MOCKS ? mockDriverData : realDriverData;
