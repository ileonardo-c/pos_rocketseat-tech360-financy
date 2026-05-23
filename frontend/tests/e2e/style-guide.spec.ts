/**
 * E2E — Style Guide page
 *
 * Covers: rendering of all 7 sections, Input states (empty/active/filled/error/
 * disabled/select-row), Label Button enabled/disabled, IconButton aria-labels,
 * Link, PaginationButton states, Tag palette (8 colors + keyboard role),
 * Type indicators, h1 uniqueness, and visual evidence screenshots.
 *
 * Imports: @playwright/test  (project standard — playwright.config.ts uses same)
 * Run:     npx playwright test tests/e2e/style-guide.spec.ts
 */
import { expect, test } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:5173";

const capture = async (page: Page, info: TestInfo, name: string) => {
  const filePath = info.outputPath(`${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true, animations: "disabled", caret: "hide" });
  await info.attach(`evidence-${name}`, { path: filePath, contentType: "image/png" });
};

const gotoStyleGuide = async (page: Page) => {
  await page.goto(`${APP_URL}/style-guide`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("style-guide-page").waitFor({ timeout: 10_000 });
};

/* ─── 1. Page structure ───────────────────────────────────────────────────── */

test("@style-guide renders page container and h1", async ({ page }) => {
  await gotoStyleGuide(page);
  await expect(page.getByTestId("style-guide-page")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Componentes" })).toBeVisible();
});

test("@style-guide has a single h1", async ({ page }) => {
  await gotoStyleGuide(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});

test("@style-guide renders all seven component sections", async ({ page }) => {
  await gotoStyleGuide(page);
  for (const tid of [
    "section-input",
    "section-label-button",
    "section-icon-button",
    "section-link",
    "section-pagination-button",
    "section-tag",
    "section-type",
  ]) {
    await expect(page.getByTestId(tid)).toBeVisible();
  }
});

/* ─── 2. Input states ─────────────────────────────────────────────────────── */

test("@style-guide Input Empty — shows placeholder, no value, not disabled", async ({ page }) => {
  await gotoStyleGuide(page);
  const input = page.getByTestId("input-empty");
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute("placeholder", "Placeholder");
  await expect(input).not.toBeDisabled();
});

test("@style-guide Input Active — value 'Text', wrapper has brand border", async ({ page }) => {
  await gotoStyleGuide(page);
  const input = page.getByTestId("input-active");
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("Text");
  // Border class is applied directly to the <input> element via fieldClass
  await expect(input).toHaveClass(/border-financy-primary|border-\[#1f6f43\]/);
});

test("@style-guide Input Filled — value 'Text', enabled", async ({ page }) => {
  await gotoStyleGuide(page);
  const input = page.getByTestId("input-filled");
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("Text");
  await expect(input).not.toBeDisabled();
});

test("@style-guide Input Error — aria-invalid=true and danger border", async ({ page }) => {
  await gotoStyleGuide(page);
  const input = page.getByTestId("input-error");
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  // Border + ring class applied directly to the <input> element
  await expect(input).toHaveClass(/border-financy-field-error|border-\[#ef4444\]/);
});

test("@style-guide Input Disabled — not interactive", async ({ page }) => {
  await gotoStyleGuide(page);
  await expect(page.getByTestId("input-disabled")).toBeDisabled();
});

test("@style-guide Input Select row — shows 'Option 1' value", async ({ page }) => {
  await gotoStyleGuide(page);
  const input = page.getByTestId("input-select");
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("Option 1");
});

/* ─── 3. Select component — open / close behavior ────────────────────────── */

test("@style-guide Select opens on click and closes on second click", async ({ page }) => {
  await gotoStyleGuide(page);
  const trigger = page.getByTestId("select-demo");
  await expect(trigger).toBeVisible();

  // Initially closed
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  // Open
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("listbox")).toBeVisible();

  // Close by clicking trigger again — wait for listbox to disappear (150ms close animation)
  await trigger.click();
  await expect(page.getByRole("listbox")).not.toBeVisible({ timeout: 2000 });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("@style-guide Select opens with ArrowDown and highlights next option", async ({ page }) => {
  await gotoStyleGuide(page);
  const trigger = page.getByTestId("select-demo");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("listbox")).toBeVisible();
});

test("@style-guide Select closes with Escape key", async ({ page }) => {
  await gotoStyleGuide(page);
  const trigger = page.getByTestId("select-demo");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).not.toBeVisible({ timeout: 2000 });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("@style-guide Select selects an option via click and updates trigger label", async ({ page }) => {
  await gotoStyleGuide(page);
  const trigger = page.getByTestId("select-demo");
  await trigger.click();
  await page.getByRole("option", { name: "Option 2" }).getByRole("button").click();
  await expect(trigger).toContainText("Option 2");
  await expect(page.getByRole("listbox")).not.toBeVisible({ timeout: 2000 });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("@style-guide Select chevron rotates 180° when open", async ({ page }) => {
  await gotoStyleGuide(page);
  const trigger = page.getByTestId("select-demo");
  // Locate <span aria-hidden> that wraps the chevron SVG — it carries the rotate class
  const chevron = trigger.locator("span[aria-hidden='true']");

  // Closed: chevron should NOT have rotate-180
  await expect(chevron).not.toHaveClass(/rotate-180/);

  // Open: chevron span should have rotate-180
  await trigger.click();
  await expect(chevron).toHaveClass(/rotate-180/);
});

/* ─── 4. Label Button ─────────────────────────────────────────────────────── */

test("@style-guide Button Md Default — two enabled buttons", async ({ page }) => {
  await gotoStyleGuide(page);
  const buttons = page.getByTestId("btn-md-default").getByRole("button", { name: "Label" });
  await expect(buttons).toHaveCount(2);
  for (const btn of await buttons.all()) {
    await expect(btn).toBeEnabled();
  }
});

test("@style-guide Button Md Disabled — buttons have disabled attribute", async ({ page }) => {
  await gotoStyleGuide(page);
  const buttons = page.getByTestId("btn-md-disabled").getByRole("button", { name: "Label" });
  await expect(buttons).toHaveCount(2);
  for (const btn of await buttons.all()) {
    await expect(btn).toBeDisabled();
  }
});

test("@style-guide Button Sm Default — two small buttons visible", async ({ page }) => {
  await gotoStyleGuide(page);
  await expect(page.getByTestId("btn-sm-default").getByRole("button", { name: "Label" })).toHaveCount(2);
});

test("@style-guide Button Sm Disabled — buttons have disabled attribute", async ({ page }) => {
  await gotoStyleGuide(page);
  const buttons = page.getByTestId("btn-sm-disabled").getByRole("button", { name: "Label" });
  for (const btn of await buttons.all()) {
    await expect(btn).toBeDisabled();
  }
});

/* ─── 5. Icon Button ──────────────────────────────────────────────────────── */

test("@style-guide IconButton Default — enabled, all have aria-label", async ({ page }) => {
  await gotoStyleGuide(page);
  const group = page.getByTestId("icon-btn-default");
  await expect(group.getByRole("button", { name: "Add user" })).toBeEnabled();
  await expect(group.getByRole("button", { name: "Delete" })).toBeEnabled();
});

test("@style-guide IconButton Disabled — both buttons disabled", async ({ page }) => {
  await gotoStyleGuide(page);
  const group = page.getByTestId("icon-btn-disabled");
  await expect(group.getByRole("button", { name: "Add user" })).toBeDisabled();
  await expect(group.getByRole("button", { name: "Delete" })).toBeDisabled();
});

test("@style-guide all icon buttons carry accessible labels", async ({ page }) => {
  await gotoStyleGuide(page);
  const iconButtons = page.locator('[data-testid^="icon-btn"] button');
  for (const btn of await iconButtons.all()) {
    const label = await btn.getAttribute("aria-label");
    expect(label, "Every icon button must have aria-label").toBeTruthy();
  }
});

/* ─── 6. Link ─────────────────────────────────────────────────────────────── */

test("@style-guide Link Default — visible, text Label, href='#'", async ({ page }) => {
  await gotoStyleGuide(page);
  const link = page.getByTestId("link-default");
  await expect(link).toBeVisible();
  await expect(link).toHaveText(/Label/);
  await expect(link).toHaveAttribute("href", "#");
});

test("@style-guide Link Hover — has underline border-b class", async ({ page }) => {
  await gotoStyleGuide(page);
  await expect(page.getByTestId("link-hover")).toHaveClass(/border-b/);
});

/* ─── 7. Pagination Button ────────────────────────────────────────────────── */

test("@style-guide PaginationButton Default — enabled, label '1'", async ({ page }) => {
  await gotoStyleGuide(page);
  await expect(page.getByTestId("pag-default")).toBeEnabled();
  await expect(page.getByTestId("pag-default")).toHaveText("1");
});

test("@style-guide PaginationButton Active — brand background class", async ({ page }) => {
  await gotoStyleGuide(page);
  await expect(page.getByTestId("pag-active")).toHaveClass(/bg-\[#1f6f43\]/);
});

test("@style-guide PaginationButton Disabled — not interactive", async ({ page }) => {
  await gotoStyleGuide(page);
  await expect(page.getByTestId("pag-disabled")).toBeDisabled();
});

/* ─── 8. Tag ──────────────────────────────────────────────────────────────── */

const TAG_CATEGORIES = ["gray", "blue", "purple", "pink", "red", "orange", "yellow", "green"] as const;

for (const cat of TAG_CATEGORIES) {
  test(`@style-guide Tag ${cat} — visible and contains text`, async ({ page }) => {
    await gotoStyleGuide(page);
    const tag = page.getByTestId(`tag-${cat}`);
    await expect(tag).toBeVisible();
    await expect(tag).toHaveText("Label");
  });
}

test("@style-guide Tags have role=button and tabindex=0", async ({ page }) => {
  await gotoStyleGuide(page);
  for (const cat of TAG_CATEGORIES) {
    const tag = page.getByTestId(`tag-${cat}`);
    await expect(tag).toHaveAttribute("role", "button");
    await expect(tag).toHaveAttribute("tabindex", "0");
  }
});

/* ─── 9. Type ─────────────────────────────────────────────────────────────── */

test("@style-guide Type income — 'Entrada' in green text", async ({ page }) => {
  await gotoStyleGuide(page);
  const income = page.getByTestId("type-income");
  await expect(income).toBeVisible();
  await expect(income).toHaveText(/Entrada/);
  await expect(income).toHaveClass(/text-\[#15803d\]/);
});

test("@style-guide Type expense — 'Saída' in red text", async ({ page }) => {
  await gotoStyleGuide(page);
  const expense = page.getByTestId("type-expense");
  await expect(expense).toBeVisible();
  await expect(expense).toHaveText(/Saída/);
  await expect(expense).toHaveClass(/text-\[#b91c1c\]/);
});

/* ─── 10. Visual evidence ─────────────────────────────────────────────────── */

test("@visual style-guide screenshot at 1440px", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoStyleGuide(page);
  await capture(page, info, "style-guide-1440");
});

test("@visual style-guide screenshot at 390px (mobile)", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoStyleGuide(page);
  await capture(page, info, "style-guide-390");
});
