import logger from "./logger";

describe("application logger", () => {
  it("uses the configured default log level", () => {
    expect(logger.level).toBe(
      process.env.NODE_ENV === "development" ? "debug" : "info",
    );
  });
});
