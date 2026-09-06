// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SiteFooter } from "./site-footer";

afterEach(cleanup);

describe("site footer", () => {
  it("matches the main website content and link order", () => {
    render(<SiteFooter />);

    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByText(
        "End-to-end software engineering from the Philippines, available worldwide.",
      ),
    ).toBeTruthy();
    expect(
      within(footer)
        .getByRole("link", { name: "Privacy policy" })
        .getAttribute("href"),
    ).toBe("/privacy-policy");

    const labels = within(footer)
      .getAllByRole("link")
      .map((link) => link.getAttribute("aria-label"))
      .filter(Boolean);

    expect(labels).toEqual([
      "Email",
      "LinkedIn",
      "GitHub",
      "Upwork",
      "WhatsApp",
      "Telegram",
    ]);
    expect(within(footer).queryByText("Made with")).toBeNull();
    expect(within(footer).queryByRole("button", { name: /theme/i })).toBeNull();
  });

  it("uses the same destinations and safe external link behavior", () => {
    render(<SiteFooter />);

    const expectedLinks = {
      Email: "mailto:hello@joween.dev",
      LinkedIn: "https://www.linkedin.com/in/joweenflores/",
      GitHub: "https://github.com/jcf-dev",
      Upwork: "https://www.upwork.com/freelancers/jcfdev",
      WhatsApp: "https://wa.me/639944860433",
      Telegram: "https://t.me/jcfdev",
    };

    for (const [label, href] of Object.entries(expectedLinks)) {
      const link = screen.getByRole("link", { name: label });
      expect(link.getAttribute("href")).toBe(href);

      if (href.startsWith("http")) {
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      } else {
        expect(link.getAttribute("target")).toBeNull();
      }
    }
  });
});
