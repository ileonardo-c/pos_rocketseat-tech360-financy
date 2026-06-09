import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const referenceDir = path.resolve(process.cwd(), "e2e/reference/style-guide");

const requiredSections = [
  "section-fonts-and-tokens",
  "section-input",
  "section-select",
  "section-button",
  "section-icon-button",
  "section-link",
  "section-pagination",
  "section-checkbox",
  "section-tag",
  "section-type",
  "section-icons",
];

test.describe("@visual style guide reference", () => {
  test("@visual captures desktop and mobile style-guide references", async ({ page }) => {
    fs.mkdirSync(referenceDir, { recursive: true });

    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto("/style-guide", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("style-guide-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Componentes" })).toBeVisible({
      timeout: 15_000,
    });

    for (const section of requiredSections) {
      await expect(page.getByTestId(section)).toBeVisible({ timeout: 15_000 });
    }

    await expect(page.getByTestId("style-guide-icon-catalog")).toHaveAttribute(
      "data-icon-count",
      /^[3-9]\d$/,
    );

    const select = page.getByTestId("select-demo");
    await expect(select).toBeVisible({ timeout: 15_000 });
    await select.click();
    await expect(page.locator(".t-dropdown")).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      fullPage: true,
      path: path.join(referenceDir, "desktop.png"),
    });

    await page.setViewportSize({ width: 390, height: 1200 });
    await page.goto("/style-guide", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("style-guide-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("section-icons")).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      fullPage: true,
      path: path.join(referenceDir, "mobile.png"),
    });
  });
});
