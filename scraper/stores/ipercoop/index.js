import { acceptCookies, launchBrowser, scrapeVolatinoPiu } from "../../scraper.utils.js"
import config from "../../scraper.config.json" with {type: "json"}
import { Logger } from "../../../lib/logger.js"
import { Cluster } from "puppeteer-cluster"
export const scrapeIperCoop = async () => {
  const { page, browser } = await launchBrowser(
    "https://coopliguria.promoipercoop.it",
    ""
  );

  try {
    await acceptCookies(page, config.cookies.cybot);

    const selectors = config.ipercoop;
    const coopSelectors = config.coop;

    await page.type(selectors.search, "genova");
    await page.keyboard.press("Enter");

    const shop = await page.waitForSelector(
      `${coopSelectors.search}:has(img[src*='Ipercoop'])`
    );
    await shop.click();
    await page.waitForNavigation();

    Logger.log("Phase 2️⃣ - Scraping");

    const flyers = await page.$$eval(selectors.cauroselBtn, (as) =>
      as.map((a) => a.href)
    );

    await browser.close();

    const cluster = await Cluster.launch({
      puppeteerOptions: config.puppeteer,
      // monitor: true,
      concurrency: Cluster.CONCURRENCY_BROWSER,
      maxConcurrency: 3,
    });

    await cluster.task(async ({ page, data: url }) => {
      try {
        await page.goto(url);
        await acceptCookies(page, config.cookies.cybot);
        await scrapeVolatinoPiu({ page, shopName: "ipercoop" });
      } catch (err) {
        Logger.error(`Failed scraping ${url}: ${err.message}`);
      }
    });

    for (const flyer of flyers) {
      cluster.queue(flyer);
    }

    await cluster.idle();
    await cluster.close();
  } catch (error) {
    Logger.error(error);
    await browser.close();
  }
};
