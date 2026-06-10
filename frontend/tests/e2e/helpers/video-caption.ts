import type { Locator, Page } from "@playwright/test";

const CAPTION_CONTAINER_ID = "e2e-demo-caption";
const CURSOR_ID = "e2e-demo-cursor";
const RING_ID = "e2e-demo-ring";
const RING_KEYFRAMES_ID = "e2e-ring-keyframes";

const CAPTION_STYLES = `
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999999;
  background: rgba(0, 0, 0, 0.82);
  color: #ffffff;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  padding: 12px 24px;
  border-radius: 10px;
  max-width: 90vw;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.08);
`;

const CHECK_CAPTION_STYLES = `
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999999;
  background: rgba(16, 185, 129, 0.92);
  color: #ffffff;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  padding: 12px 24px;
  border-radius: 10px;
  max-width: 90vw;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.2);
`;

async function ensureStyles(page: Page): Promise<void> {
  const css = `
    @keyframes e2e-ring-pulse {
      0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
      100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
    }
    #${CURSOR_ID} {
      position: fixed;
      z-index: 1000000;
      width: 20px;
      height: 20px;
      pointer-events: none;
      transition: left 0.4s cubic-bezier(0.25, 0.1, 0.25, 1), top 0.4s cubic-bezier(0.25, 0.1, 0.25, 1);
    }
    #${CURSOR_ID} svg {
      width: 20px;
      height: 20px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
    }
    #${RING_ID} {
      position: fixed;
      z-index: 999998;
      pointer-events: none;
      border-radius: 8px;
      border: 2px solid rgba(59, 130, 246, 0.8);
      animation: e2e-ring-pulse 0.8s ease-out;
    }
  `;

  await page.evaluate(
    ({ styleId, cssText }) => {
      if (document.getElementById(styleId)) return;
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = cssText;
      document.head.appendChild(style);
    },
    { styleId: RING_KEYFRAMES_ID, cssText: css },
  );
}

async function ensureCursor(page: Page): Promise<void> {
  await ensureStyles(page);
  await page.evaluate((id) => {
    if (document.getElementById(id)) return;
    const cursor = document.createElement("div");
    cursor.id = id;
    // SVG cursor pointer icon
    cursor.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M5 3l14 8-6 2-4 6-4-16z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    cursor.style.left = "50%";
    cursor.style.top = "50%";
    document.body.appendChild(cursor);
  }, CURSOR_ID);
}

/**
 * Move the virtual cursor to a target element and show a ring highlight.
 */
export async function moveCursorTo(page: Page, locator: Locator): Promise<void> {
  await ensureCursor(page);
  const box = await locator.boundingBox();
  if (!box) return;

  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;

  // Move cursor with CSS transition
  await page.evaluate(
    ({ cursorId, x, y }) => {
      const cursor = document.getElementById(cursorId);
      if (cursor) {
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
      }
    },
    { cursorId: CURSOR_ID, x: targetX - 4, y: targetY - 2 },
  );

  // Wait for the transition to complete
  await page.waitForTimeout(450);

  // Show ring around the element
  await page.evaluate(
    ({ ringId, bx, by, bw, bh }) => {
      let ring = document.getElementById(ringId);
      if (!ring) {
        ring = document.createElement("div");
        ring.id = ringId;
        document.body.appendChild(ring);
      }
      ring.style.display = "block";
      ring.style.left = `${bx - 4}px`;
      ring.style.top = `${by - 4}px`;
      ring.style.width = `${bw + 8}px`;
      ring.style.height = `${bh + 8}px`;
      // Restart animation
      ring.style.animation = "none";
      void ring.offsetHeight;
      ring.style.animation = "e2e-ring-pulse 0.8s ease-out";
    },
    { ringId: RING_ID, bx: box.x, by: box.y, bw: box.width, bh: box.height },
  );

  await page.waitForTimeout(200);
}

/**
 * Hide the ring highlight.
 */
export async function hideRing(page: Page): Promise<void> {
  await page.evaluate((ringId) => {
    const ring = document.getElementById(ringId);
    if (ring) ring.style.display = "none";
  }, RING_ID);
}

/**
 * Display a caption overlay on the page for the demo video.
 */
export async function caption(page: Page, text: string): Promise<void> {
  await page.evaluate(
    ({ id, styles, content }) => {
      let container = document.getElementById(id);
      if (!container) {
        container = document.createElement("div");
        container.id = id;
        document.body.appendChild(container);
      }
      container.setAttribute("style", styles);
      container.textContent = content;
    },
    { id: CAPTION_CONTAINER_ID, styles: CAPTION_STYLES, content: text },
  );
  await page.waitForTimeout(900);
}

/**
 * Display a check/validation caption with green background.
 */
export async function checkCaption(page: Page, text: string): Promise<void> {
  await page.evaluate(
    ({ id, styles, content }) => {
      let container = document.getElementById(id);
      if (!container) {
        container = document.createElement("div");
        container.id = id;
        document.body.appendChild(container);
      }
      container.setAttribute("style", styles);
      container.textContent = content;
    },
    { id: CAPTION_CONTAINER_ID, styles: CHECK_CAPTION_STYLES, content: text },
  );
  await page.waitForTimeout(1000);
}

/**
 * Remove the caption overlay from the page.
 */
export async function clearCaption(page: Page): Promise<void> {
  await page.evaluate((id) => {
    const container = document.getElementById(id);
    if (container) container.style.display = "none";
  }, CAPTION_CONTAINER_ID);
}

/**
 * Type text into a locator character by character with humanized delays.
 * Moves cursor to the input first, shows ring, then types.
 */
export async function humanType(locator: Locator, text: string): Promise<void> {
  const page = locator.page();
  await ensureInView(locator);
  await moveCursorTo(page, locator);
  await locator.click();
  await hideRing(page);
  await locator.clear();
  for (const char of text) {
    await locator.pressSequentially(char, { delay: 0 });
    const delay = Math.floor(Math.random() * 55) + 40;
    await page.waitForTimeout(delay);
  }
  await page.waitForTimeout(150);
}

/**
 * Click a locator with cursor movement and ring effect.
 */
export async function humanClick(locator: Locator): Promise<void> {
  const page = locator.page();
  await ensureInView(locator);
  await moveCursorTo(page, locator);
  await locator.click();
  await hideRing(page);
  await page.waitForTimeout(200);
}

/**
 * Scroll element into view if it is not fully visible in the viewport.
 */
export async function ensureInView(locator: Locator): Promise<void> {
  await locator.evaluate((el) => {
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  });
  await locator.page().waitForTimeout(350);
}
