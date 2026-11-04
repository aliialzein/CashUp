import logger from "./logger";
import { describe, expect, it } from "@jest/globals";

describe("application logger", () => {
	it("uses the configured default log level", () => {
		expect(logger.level).toBe(
			process.env.NODE_ENV === "development" ? "debug" : "info",
		);
	});
});
