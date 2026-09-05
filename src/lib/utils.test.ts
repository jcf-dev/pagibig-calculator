import { describe, expect, it } from "vitest";
import { formatMoneyInput, formatWholePeso, parseMoneyInput } from "./utils";

describe("money input formatting", () => {
  it("adds Philippine thousand separators", () => {
    expect(formatMoneyInput(3000000)).toBe("3,000,000");
    expect(formatMoneyInput(20762.62)).toBe("20,762.62");
  });

  it("formats compact report values as whole pesos", () => {
    expect(formatWholePeso(346860.51)).toBe("₱346,861");
  });

  it("parses formatted peso values", () => {
    expect(parseMoneyInput("₱ 3,000,000.50")).toBe(3000000.5);
    expect(Number.isNaN(parseMoneyInput(""))).toBe(true);
    expect(Number.isNaN(parseMoneyInput("not money"))).toBe(true);
  });
});
