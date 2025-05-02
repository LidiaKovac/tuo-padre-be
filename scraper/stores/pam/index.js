import { acceptCookies, launchBrowser, scrapeVolatinoPiu } from "../../scraper.utils.js"
import config from "../../scraper.config.json" with {type: "json"}
import { Logger } from "../../../lib/logger.js"
import { Cluster } from "puppeteer-cluster"
import puppeteer from "puppeteer"
export const scrapePam = async () => {
  try {
    const { page, browser } = await launchBrowser(
      "https://www.pampanorama.it/",
      "punti-vendita/genova-lagaccio"
    )
    const selectors = config
    const cookies = selectors.cookies
    const pam = selectors.pam
    await acceptCookies(page, cookies.save)
    await page.waitForSelector(`${pam.carousel} a`)
    let urls = await page.$$eval(
      `${pam.carousel} a`,
      (els) => els.map(({ href }) => href)
    )
    console.log(urls)
    const cluster = await Cluster.launch({
      puppeteerOptions: config.puppeteer,
      // monitor: true, 
      concurrency: Cluster.CONCURRENCY_BROWSER,
      maxConcurrency: 3
    })

    await cluster.task(async ({ page, data: url }) => {
      try {
        await page.goto(url)
        await acceptCookies(page, config.cookies.save) //?
        await scrapeVolatinoPiu({ page, shopName: "pam" })
      } catch (error) {
        Logger.error(`Failed scraping ${url}: ${error.message}`)
      }
    })

    for (const url of urls) {
      await cluster.queue(url)
    }
    await cluster.idle()
    await cluster.close()
    await browser.close()
  } catch (error) {
    Logger.error(error)
  }
}