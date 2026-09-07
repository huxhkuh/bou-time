import { test, expect } from "@playwright/test";

async function prepare(page, multiple = false) {
  const backup = {
    version: 1,
    revision: 0,
    clients: [{ id: "fc", name: "סטודיו בדיקה" }],
    projects: [
      {
        id: "fp",
        clientId: "fc",
        name: "פרויקט מיקוד",
        description: "",
        color: "#b94f2a",
        archived: false,
        priceType: "hourly",
        price: 200,
        goal: null,
      },
    ],
    entries: [],
    timer: null,
  };
  if (multiple)
    backup.projects.push({
      ...backup.projects[0],
      id: "sp",
      name: "פרויקט שני",
      color: "#788463",
    });
  await page.goto("/");
  await page
    .getByRole("button", { name: "גיבוי והגדרות", exact: true })
    .click();
  await page.locator("input[type=file]").setInputFiles({
    name: "focus.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("button", { name: "ייבוא ומיזוג", exact: true }).click();
  await expect(
    page.getByText("הגיבוי מוזג בהצלחה. פריטים קיימים לא שוכפלו."),
  ).toBeVisible();
  await page.getByRole("button", { name: "היום", exact: true }).click();
}
test("focus mode controls the existing timer, supports theme and keyboard, closes without stopping", async ({
  page,
}) => {
  await prepare(page);
  await page.getByRole("button", { name: "התחל מדידה", exact: true }).click();
  await page.getByRole("button", { name: "מצב מיקוד", exact: true }).click();
  const focus = page.getByRole("dialog", { name: "מצב מיקוד", exact: true });
  await expect(
    focus.getByRole("heading", { name: "פרויקט מיקוד" }),
  ).toBeVisible();
  await focus.getByRole("button", { name: "השהיה", exact: true }).click();
  await expect(
    focus.getByRole("button", { name: "המשך", exact: true }),
  ).toBeVisible();
  const paused = await focus.locator(".focus-digits").textContent();
  await focus
    .getByRole("button", { name: "מעבר לצג בהיר", exact: true })
    .click();
  await expect(focus.locator(".focus-clock")).toHaveClass(/is-light/);
  await expect(focus.locator(".focus-digits")).toHaveText(paused);
  await page.screenshot({ path: "../../work/focus-desktop.png" });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "המשך", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Alt+KeyF");
  await focus.getByRole("button", { name: "המשך", exact: true }).click();
  await focus
    .getByRole("button", { name: "יציאה ממצב מיקוד", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "השהיה", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "מצב מיקוד", exact: true }).click();
  await focus
    .getByRole("button", { name: "עצירה ושמירה", exact: true })
    .click();
  await expect(focus.getByText("הזמן נשמר. עבודה טובה.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("tbody tr")).toHaveCount(1);
});
test("unsupported floating window explains the limitation and offers mobile focus mode", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "documentPictureInPicture", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  await page.getByRole("button", { name: "צג צף", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "צג מעל החלונות" }),
  ).toContainText("Chrome או Edge");
  await page
    .getByRole("button", { name: "פתיחת מצב מיקוד כאן", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "מצב מיקוד" })).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "התחל מדידה", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "../../work/focus-mobile.png" });
});
test("real Picture-in-Picture window shares state and can pause, resume and stop exactly once", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await prepare(page);
  await page.getByRole("button", { name: "התחל מדידה", exact: true }).click();
  const childPromise = context.waitForEvent("page", { timeout: 12000 });
  await page.getByRole("button", { name: "צג צף", exact: true }).click();
  const child = await childPromise;
  await child.setViewportSize({ width: 360, height: 260 });
  await expect(child.getByRole("region", { name: "שעון צף" })).toBeVisible();
  await expect(
    child.getByRole("button", { name: "עבודה על פרויקט מיקוד" }),
  ).toBeVisible();
  await expect(child.locator("html")).toHaveAttribute("dir", "rtl");
  expect(
    await child.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await child.getByRole("button", { name: "השהיה", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "המשך", exact: true }),
  ).toBeVisible();
  await child.getByRole("button", { name: "המשך", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "השהיה", exact: true }),
  ).toBeVisible();
  await child.screenshot({ path: "../../work/floating-timer.png" });
  await child
    .getByRole("button", { name: "סגירת הצג הצף", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "השהיה", exact: true }),
  ).toBeVisible();
  const again = context.waitForEvent("page");
  await page.getByRole("button", { name: "צג צף", exact: true }).click();
  const second = await again;
  await second
    .getByRole("button", { name: "עצירה ושמירה", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    second.getByRole("button", { name: "התחל מדידה", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("tiny floating switcher stacks projects and saves exactly once when switching", async ({
  page,
  context,
}) => {
  await prepare(page, true);
  const opened = context.waitForEvent("page");
  await page.getByRole("button", { name: "צג צף", exact: true }).click();
  const child = await opened;
  await child.setViewportSize({ width: 240, height: 154 });
  const first = child.getByRole("button", {
    name: "עבודה על פרויקט מיקוד",
    exact: true,
  });
  const second = child.getByRole("button", {
    name: "עבודה על פרויקט שני",
    exact: true,
  });
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  expect((await second.boundingBox()).y).toBeGreaterThan(
    (await first.boundingBox()).y,
  );
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await expect(child.locator(".focus-digits")).not.toHaveText("00:00:00");
  await second.dblclick();
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await child.getByRole("button", { name: "השהיה", exact: true }).click();
  await expect(
    child.getByRole("button", { name: "המשך", exact: true }),
  ).toBeVisible();
  await second.click();
  await expect(
    child.getByRole("button", { name: "השהיה", exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await child.getByRole("button", { name: "הגדלת הצג", exact: true }).click();
  await expect(child.locator(".compact-clock")).not.toHaveClass(/is-tiny/);
  await child.getByRole("button", { name: "מצב זעיר", exact: true }).click();
  await expect(child.locator(".compact-clock")).toHaveClass(/is-tiny/);
  expect(
    await child.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await child.screenshot({ path: "../../work/tiny-floating.png" });
  await child
    .getByRole("button", { name: "עצירה ושמירה", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
});
