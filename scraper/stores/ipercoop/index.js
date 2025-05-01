import { acceptCookies, launchBrowser, scrapeVolatinoPiu } from "../../scraper.utils.js"
import config from "../../scraper.config.json" with {type: "json"}
import { Logger } from "../../../lib/logger.js"
export const scrapeIperCoop = async() => {
    try {
      // Launch the browser and open a new blank page
      const { page, browser } = await launchBrowser(
        "https://coopliguria.promoipercoop.it",
        ""
      )
      await acceptCookies(
        page,
        config.cookies.cybot
      )
      const selectors = config.ipercoop
      const coopSelectors = config.coop
      await page.type(selectors.search, "genova")

      await page.keyboard.press("Enter")
      const shop = await page.waitForSelector(
        `${coopSelectors.search}:has(img[src*='Ipercoop'])`
      )
      await shop.click()
      // Type into search box
      // await delay(3000)
      Logger.level(1).log("Phase 2️⃣ - Scraping")
      const flyers = await page.$$(selectors.courselBtn)
      for (const flyer of flyers) {
        const href = await flyer.$eval("a", ({ href }) => href)
        const { page: curr } = await this.launchBrowser(href, "")
        await curr.goto(href)

        await scrapeVolatinoPiu({
          page: curr,
          shopName: "ipercoop",
        })
      }
      await browser.close()
    } catch (error) {
      Logger.error(error)
    }
  }