import { describe, expect, it } from "vitest";

import { contentType, size } from "@/app/icon";
import { LAB_BASE_PATH, LAB_URL, LABS_URL } from "./site";

describe("lab deployment URLs", () => {
  it("keeps the calculator under its permanent lab path", () => {
    expect(LAB_BASE_PATH).toBe("/labs/pagibig-calculator");
    expect(LAB_URL).toBe("https://joween.dev/labs/pagibig-calculator");
    expect(LABS_URL).toBe("https://joween.dev/labs");
  });

  it("uses the main website favicon format", () => {
    expect(size).toEqual({ width: 32, height: 32 });
    expect(contentType).toBe("image/png");
  });
});
