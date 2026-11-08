/** Mocks stay on unless the env variable USE_MOCKS is set to "0". */
export const USE_MOCKS = process.env.USE_MOCKS !== "0";
