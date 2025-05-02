import { Logger } from "../../../lib/logger.js"
import config from "../../scraper.config.json" with {type: "json"}
import { acceptCookies, launchBrowser, scrapeVolatinoPiu } from "../../scraper.utils.js"
export const scrapeCoop = async () => {
  try {
    // Launch the browser and open a new blank page
    const { page, browser } = await launchBrowser(
      "https://volantinocoop.it/",
      "cerca"
    )


    const selectors = config.coop
    await page.type(selectors.input, "genova")

    // await delay(1000)
    await page.waitForSelector(selectors.submit)
    const sub = await page.$(selectors.submit)
    await sub.scrollIntoView()
    await sub.click()

    const shop = await page.waitForSelector(selectors.search)
    await shop.click()
    await page.waitForNavigation()
    await acceptCookies(
      page,
      config.cookies.cybot
    )
    Logger.log("Phase 2️⃣ - Scraping")

    await scrapeVolatinoPiu({
      page,
      shopName: "coop",
    })
    await browser.close()
  } catch (error) {
    Logger.error(error)
  }
}