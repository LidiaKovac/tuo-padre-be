import { acceptCookies, launchBrowser, scrapeVolatinoPiu } from "../../scraper.utils.js"
import config from "../../scraper.config.json" with {type: "json"}
export const scrapePam = async() => {
        try {
          const { page, browser } = await launchBrowser(
            "https://www.pampanorama.it/",
            "punti-vendita/genova-lagaccio"
          )
          const {cookies, selectors: pam} = config 
          await acceptCookies(page, cookies.save)
          await page.waitForSelector(`${pam.carousel} a`)
          let counter = await page.$$eval(
            `${pam.carousel} a`,
            ({ length }) => length
          )
          for (let i = 1; i <= counter; i++) {
            const volantino = await page.$(`${pam.carousel}:nth-of-type(${i}) a`)
            if (volantino && volantino.$(pam.volantinoImg)) {
              await volantino.click()
              await page.reload()
              Logger.level(1).log("Phase 2️⃣ - Scraping")
              await scrapeVolatinoPiu({
                page,
                shopName: "pam",
              })
              Logger.log("Flyer completed, moving on to next...")
    
              await page.goBack()
            }
          }
          await browser.close()
        } catch (error) {
          Logger.error(error)
        }
}