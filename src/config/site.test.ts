import { describe, expect, it } from "vitest";

import { LAB_BASE_PATH, LAB_URL, LABS_URL } from "./site";

describe("lab deployment URLs", () => {
  it("keeps the calculator under its permanent lab path", () => {
    expect(LAB_BASE_PATH).toBe("/labs/pagibig-calculator");
    expect(LAB_URL).toBe("https://joween.dev/labs/pagibig-calculator");
    expect(LABS_URL).toBe("https://joween.dev/labs");
  });
});
