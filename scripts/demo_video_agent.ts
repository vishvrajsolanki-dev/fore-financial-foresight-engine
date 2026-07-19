/**
 * FORE live demo video agent — Playwright walkthrough of production.
 * Records video to /tmp/fore-demo-video then copies to /opt/cursor/artifacts.
 */
import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.DEMO_BASE_URL ?? "https://fore-financial-foresight-engine.vercel.app";
const OUT_DIR = "/tmp/fore-demo-video";
const ARTIFACT_DIR = "/opt/cursor/artifacts/demo-video";
const EMAIL = `video_demo_${Date.now()}@fore.test`;
const PASS = "VideoDemo!23456";

async function pause(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function shot(page: Page, name: string) {
  const p = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log("shot", p);
}

async function safeClick(page: Page, selector: string) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 15000 });
  await loc.click();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT_DIR, size: { width: 1440, height: 900 } },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  console.log("BASE", BASE, "EMAIL", EMAIL);

  // 1) Landing
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await pause(1500);
  await shot(page, "01-landing");

  // 2) Register
  await page.goto(BASE + "/register", { waitUntil: "networkidle" });
  await pause(800);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await shot(page, "02-register");
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL(/onboarding|home|past/, { timeout: 60000 });
  await pause(1500);
  await shot(page, "03-after-register");

  // 3) Onboarding — demo data
  if (!page.url().includes("onboarding")) {
    await page.goto(BASE + "/onboarding", { waitUntil: "networkidle" });
  }
  await pause(800);
  // Welcome → Continue
  const continueBtn = page.getByRole("button", { name: /continue/i });
  if (await continueBtn.count()) {
    await continueBtn.first().click();
    await pause(800);
  }
  await shot(page, "04-onboarding-choose");
  const demoBtn = page.getByRole("button", { name: /demo data|use demo/i });
  if (await demoBtn.count()) {
    await demoBtn.first().click();
    await pause(4000);
  }
  // Done → Home
  const homeBtn = page.getByRole("button", { name: /go to home/i });
  if (await homeBtn.count()) {
    await homeBtn.first().click();
  } else {
    await page.goto(BASE + "/home", { waitUntil: "networkidle" });
  }
  await pause(2000);
  await shot(page, "05-home-pulse");

  // 4) Past
  await page.goto(BASE + "/past", { waitUntil: "networkidle" });
  await pause(2500);
  await shot(page, "06-past");

  // 5) Decide
  await page.goto(BASE + "/decide", { waitUntil: "networkidle" });
  await pause(1500);
  await shot(page, "07-decide");
  const input = page.locator('input[aria-label="Affordability question"]').or(page.locator("input.input")).first();
  await input.waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
  if (await input.count()) {
    await input.fill("Can I afford a 5000 headphones?");
    await pause(500);
    const ask = page.getByRole("button", { name: /^ask$/i });
    if (await ask.count()) await ask.first().click();
    else await page.keyboard.press("Enter");
    // wait for assistant reply bubble
    await page.locator(".card").filter({ hasText: /afford|zero-balance|headphones/i }).first()
      .waitFor({ timeout: 45000 })
      .catch(() => undefined);
    await pause(2500);
  }
  // optional context drawer
  const ctxBtn = page.getByRole("button", { name: /context/i });
  if (await ctxBtn.count()) {
    await ctxBtn.first().click();
    await pause(1500);
    await shot(page, "08-decide-context");
    const close = page.getByRole("button", { name: /close/i });
    if (await close.count()) await close.first().click();
  }
  await shot(page, "09-decide-verdict");

  // 6) Ahead
  await page.goto(BASE + "/ahead", { waitUntil: "networkidle" });
  await pause(2500);
  await shot(page, "10-ahead");

  // 7) Insights
  await page.goto(BASE + "/insights", { waitUntil: "networkidle" });
  await pause(2500);
  await shot(page, "11-insights");

  // 8) Reports
  await page.goto(BASE + "/reports", { waitUntil: "networkidle" });
  await pause(1500);
  const gen = page.getByRole("button", { name: /generate preview/i });
  if (await gen.count()) {
    await gen.first().click();
    await pause(2500);
  }
  await shot(page, "12-reports");

  // 9) Settings + Evening
  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await pause(1200);
  await shot(page, "13-settings");
  const appearanceCard = page.getByRole("button", { name: /appearance/i });
  if (await appearanceCard.count()) {
    await appearanceCard.first().click();
    await pause(800);
    const evening = page.getByRole("button", { name: /^evening$/i });
    if (await evening.count()) {
      await evening.first().click();
      await pause(1500);
    }
    await shot(page, "14-evening");
  }

  // 10) Back to home finale
  await page.goto(BASE + "/home", { waitUntil: "networkidle" });
  await pause(2000);
  await shot(page, "15-finale-home");

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const rawPath = await video.path();
    const destWebm = path.join(ARTIFACT_DIR, "fore-live-demo.webm");
    fs.copyFileSync(rawPath, destWebm);
    console.log("video_webm", destWebm);

    // Transcode to mp4 for broader playback
    const destMp4 = path.join(ARTIFACT_DIR, "fore-live-demo.mp4");
    const { spawnSync } = await import("child_process");
    const ff = spawnSync(
      "ffmpeg",
      ["-y", "-i", destWebm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", destMp4],
      { stdio: "inherit" }
    );
    if (ff.status === 0) console.log("video_mp4", destMp4);
    else console.warn("ffmpeg failed", ff.status);
  }

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "demo-meta.json"),
    JSON.stringify({ base: BASE, email: EMAIL, createdAt: new Date().toISOString() }, null, 2)
  );
  console.log("DEMO_VIDEO_DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
