/**
 * FORE trailer recorder — follows docs/DEMO_STORYBOARD.md (demo mode, no auth).
 * Desktop ~90–110s @ 1440×900; mobile ~75s @ 390×844.
 *
 * Usage:
 *   DEMO_BASE_URL=http://127.0.0.1:3000 npx tsx scripts/record_storyboard_demo.ts
 */
import { chromium, type Browser, type Page } from "playwright";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const BASE = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3000";
const ARTIFACT_DIR = "/opt/cursor/artifacts/demo-storyboard";
const TMP_DIR = "/tmp/fore-storyboard-video";

async function pause(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function shot(page: Page, name: string) {
  const p = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log("shot", p);
}

async function loadDemo(page: Page) {
  await page.goto(BASE + "/onboarding", { waitUntil: "networkidle" });
  await pause(600);
  const demoBtn = page.getByRole("button", { name: /use demo data/i });
  await demoBtn.first().waitFor({ state: "visible", timeout: 20000 });
  await demoBtn.first().click();
  await page.getByRole("link", { name: /open past/i }).waitFor({ state: "visible", timeout: 30000 });
  await pause(800);
}

/** Prefer SPA nav so financial_context stays in memory. */
async function goFace(page: Page, face: "past" | "decide" | "ahead", mobile: boolean) {
  const href = `/${face}`;
  const link = mobile
    ? page.locator(`.mobile-tabbar a[href="${href}"]`)
    : page.locator(`.app-sidebar a[href="${href}"]`);
  if (await link.count()) {
    await link.first().click({ force: mobile });
    await pause(1400);
    return;
  }
  await page.goto(BASE + href, { waitUntil: "networkidle" });
  await pause(1500);
}

async function askLaptop(page: Page, opts: { showMath: boolean }) {
  const suggestion = page.getByRole("button", { name: /Can I afford a ₹15,000 laptop/i });
  if (await suggestion.count()) {
    await suggestion.first().click();
  } else {
    const input = page
      .locator('input[aria-label="Affordability question"]')
      .or(page.locator("input.input"))
      .first();
    await input.waitFor({ state: "visible", timeout: 15000 });
    await input.fill("Can I afford a ₹15,000 laptop next month?");
    await pause(400);
    const ask = page.getByRole("button", { name: /^ask$/i });
    if (await ask.count()) await ask.first().click();
    else await page.keyboard.press("Enter");
  }

  const verified = page.getByText(/checked your numbers/i);
  try {
    await verified.first().waitFor({ state: "visible", timeout: 45000 });
  } catch {
    // retry once per storyboard Phase 3
    await pause(800);
    if (await suggestion.count()) await suggestion.first().click();
    await verified.first().waitFor({ state: "visible", timeout: 45000 }).catch(() => undefined);
  }
  await pause(2500);

  if (opts.showMath) {
    const math = page.getByRole("button", { name: /show the math/i });
    if (await math.count()) {
      await math.first().click();
      await pause(2000);
    }
  }
}

async function setAheadGoal(page: Page) {
  const amount = page.locator('input[type="number"]').first();
  const date = page.locator('input[type="date"]').first();
  if (await amount.count()) {
    await amount.fill("100000");
    const future = new Date();
    future.setMonth(future.getMonth() + 6);
    const iso = future.toISOString().slice(0, 10);
    if (await date.count()) await date.fill(iso);
    const check = page.getByRole("button", { name: /check pace/i });
    if (await check.count()) {
      await check.first().click();
      await pause(2000);
    }
  }
}

function finalizeVideo(rawPath: string, stem: string) {
  const webm = path.join(ARTIFACT_DIR, `${stem}.webm`);
  fs.copyFileSync(rawPath, webm);
  console.log("video_webm", webm);
  const mp4 = path.join(ARTIFACT_DIR, `${stem}.mp4`);
  const ff = spawnSync(
    "ffmpeg",
    ["-y", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4],
    { stdio: "inherit" }
  );
  if (ff.status === 0) console.log("video_mp4", mp4);
  else console.warn("ffmpeg failed", ff.status);
  return { webm, mp4: ff.status === 0 ? mp4 : null };
}

async function recordDesktop(browser: Browser) {
  const out = path.join(TMP_DIR, "desktop");
  fs.mkdirSync(out, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: out, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  // 0–12s Landing brand + problem
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await pause(4000);
  await shot(page, "desktop-01-landing");
  await pause(9000);

  // 12–22s Onboarding → demo
  await loadDemo(page);
  await shot(page, "desktop-02-onboarding-ready");
  await pause(2500);
  await page.getByRole("link", { name: /open past/i }).click();
  await pause(2500);

  // 22–38s PAST
  await pause(4000);
  await shot(page, "desktop-03-past");
  await page.mouse.wheel(0, 280);
  await pause(6000);
  await page.mouse.wheel(0, -200);
  await pause(4000);

  // 38–70s DECIDE USP
  await goFace(page, "decide", false);
  await pause(2000);
  await shot(page, "desktop-04-decide");
  await askLaptop(page, { showMath: true });
  await shot(page, "desktop-05-decide-verdict");
  await pause(10000);

  // 70–95s AHEAD
  await goFace(page, "ahead", false);
  await setAheadGoal(page);
  await shot(page, "desktop-06-ahead");
  await page.mouse.wheel(0, 320);
  await pause(8000);
  await page.mouse.wheel(0, -200);
  await pause(5000);

  // 95–110s Close on landing
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await pause(7000);
  await shot(page, "desktop-07-close");

  const video = page.video();
  await context.close();
  if (!video) throw new Error("no desktop video");
  return finalizeVideo(await video.path(), "fore-demo-desktop");
}

async function recordMobile(browser: Browser) {
  const out = path.join(TMP_DIR, "mobile");
  fs.mkdirSync(out, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    recordVideo: { dir: out, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  // 0–3s brand
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await pause(3500);
  await shot(page, "mobile-01-landing");

  // 3–10s demo data
  await loadDemo(page);
  await shot(page, "mobile-02-ready");
  await pause(2500);
  await page.getByRole("link", { name: /open past/i }).click();
  await pause(2000);

  // 10–25s PAST
  await pause(5000);
  await shot(page, "mobile-03-past");
  await page.mouse.wheel(0, 200);
  await pause(6000);
  await page.mouse.wheel(0, -160);
  await pause(2500);

  // 25–55s DECIDE (no math expand)
  await goFace(page, "decide", true);
  await pause(1500);
  await shot(page, "mobile-04-decide");
  await askLaptop(page, { showMath: false });
  await shot(page, "mobile-05-decide-verdict");
  await pause(9000);

  // 55–70s AHEAD
  await goFace(page, "ahead", true);
  await setAheadGoal(page);
  await shot(page, "mobile-06-ahead");
  await page.mouse.wheel(0, 240);
  await pause(8000);

  // 70–75s close — tab bar + past chrome
  await goFace(page, "past", true);
  await pause(5000);
  await shot(page, "mobile-07-close");

  const video = page.video();
  await context.close();
  if (!video) throw new Error("no mobile video");
  return finalizeVideo(await video.path(), "fore-demo-mobile");
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  console.log("BASE", BASE);
  console.log("Recording desktop…");
  const desktop = await recordDesktop(browser);
  console.log("Recording mobile…");
  const mobile = await recordMobile(browser);
  await browser.close();

  const meta = {
    base: BASE,
    createdAt: new Date().toISOString(),
    storyboard: "docs/DEMO_STORYBOARD.md",
    desktop,
    mobile,
  };
  fs.writeFileSync(path.join(ARTIFACT_DIR, "demo-meta.json"), JSON.stringify(meta, null, 2));
  console.log("STORYBOARD_DEMO_DONE", JSON.stringify(meta, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
