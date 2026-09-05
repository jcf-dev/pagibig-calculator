import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOAN_CEILING,
  DEFAULT_RATE_OPTIONS,
  RATE_ASSUMPTIONS_EFFECTIVE_DATE,
  RATE_ASSUMPTIONS_REVIEWED_DATE,
  RATE_SOURCES,
} from "./rates";

describe("rate assumptions", () => {
  it("publishes dated, editable seed assumptions with government sources", () => {
    expect(DEFAULT_LOAN_CEILING).toBe(10_000_000);
    expect(DEFAULT_RATE_OPTIONS.length).toBeGreaterThan(1);
    expect(RATE_ASSUMPTIONS_EFFECTIVE_DATE).toMatch(/\d{4}$/);
    expect(RATE_ASSUMPTIONS_REVIEWED_DATE).toMatch(/\d{4}$/);
    expect(RATE_SOURCES).toHaveLength(3);
    expect(RATE_SOURCES.every((source) => source.href.startsWith("https://"))).toBe(true);
  });
});
