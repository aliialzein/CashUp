import type { FloatSuggestion } from "@/types/cash-up";
import { hasHistory } from "./scenarios";

// TODO(backend): the server suggests the float from the driver's last counted cash-up. `null` for a first cash-up.
export const mockFloatSuggestion: FloatSuggestion | null = hasHistory
    ? { fromNumber: 42, float: { usd: "50", lbp: "1000000" } }
    : null;
