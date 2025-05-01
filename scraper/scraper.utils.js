import puppeteer from "puppeteer"
import Product from "../api/schemas/product.schema.js"
import { Logger } from "../lib/logger.js"
import config from "./scraper.config.json" with {type: "json"}
import { timeout } from "puppeteer"

/* 

  TODO: make basko easier, cleaner and lighter

  TODO: deploy as a background process
  TODO: add autopush 

  TODO: move basko to suggestions
  TODO: penny images
*/


export const launchBrowser = async (baseUrl, endpoint) => {
  try {

    Logger.log("Phase 1️⃣ - Navigating browser")

    const browser = await puppeteer.launch({
      ...config.puppeteer
    })
    const page = await browser.newPage()

    const context = browser.defaultBrowserContext()
    await context.overridePermissions(baseUrl, ["geolocation"])
    // Navigate the page to a URL
    await page.goto(baseUrl + endpoint)
    // await setRequestInterception(page)
    await page.setGeolocation({ latitude: 44.414165, longitude: 8.942184 })
    return { page, browser }
  } catch (error) {
    Logger.error(error)
    throw error
  }
}

export const acceptCookies = async (page, selector) => {
  try {
    const hasCookie = await page.$(selector)
    if (hasCookie) {
      const cookie = await page.waitForSelector(selector)
      await cookie.click()
      Logger.log("Cookies accepted")
    }
  } catch (error) {
    Logger.error("Error accepting cookies: " + error)
    // throw error
  }
}

export const setRequestInterception = async (page) => {
  await page.setRequestInterception(true);
  page.setDefaultTimeout(60 * 60 * 1000); // 1 hour timeout
  page.on("request", async (req) => {
    if (
      // req.resourceType() == "stylesheet" ||
      req.resourceType() == "font" ||
      req.resourceType() == "image"
    ) {
      await req.abort();
    } else await req.continue();
  });
}

export const scrapeVolatinoPiu = async ({ page, shopName }) => {
  try {
    await page.waitForSelector(".modal.show", { timeout: 2000 })
    const modal = await page.$(".modal.show")
    await setRequestInterception(page)
    if (modal) {
      modal.evaluate(e => e.style.display = "none")
      const backdrop = await page.$(".modal-backdrop.fade.show")
      await backdrop.evaluate(el => el.remove())

    }
    const selectors = config.volantinoPiu

    await page.waitForSelector(selectors.button, { timeout: 2000 })
    const button = await page.$(selectors.button)
    await button.click()
    await page.waitForSelector(selectors.card)
    const cards = await page.$$(selectors.card)
    const scadenza = await page.$eval(
      selectors.scadenza,
      ({ innerText }) => innerText.split(" al ")[1].trim()
    )
    const prodotti = []
    for (const card of cards) {
      let img = null
      let price = null
      let prodName = null
      let prodQuantity = null
      let needsCard = false
      img = await card.$eval(selectors.img, ({ src }) => src)

      const priceEl = await card.$(selectors.price)
      if (priceEl) {
        price = await card.$eval(selectors.price, (el) => el.innerText)
      }
      prodName = await card.$eval(`${selectors.card}${selectors.name}`, ({ innerText }) => innerText)
      prodQuantity = await card.$eval(
        `${selectors.card}${selectors.desc}`,
        ({ innerText }) => innerText
      )
      if (await card.$(selectors.needsCard)) {
        if (shopName === "pam") {
          needsCard = await card.$eval(selectors.needsCard, ({ src }) =>
            src.includes("per_te")
          )
        }
        if (shopName === "coop") {
          needsCard = await card.$eval(selectors.needsCard, ({ src }) =>
            src.includes("soci")
          )
        }
      } else needsCard = false
      prodotti.push({
        img,
        price,
        prodName,
        prodQuantity,
        store: shopName,
        needsCard,
        scadenza,
      })
    }

    await addToMongo(prodotti)
  } catch (error) {
    Logger.error(error)
  }
}

export const scrollToBottom = async (page) => {
  let currHeight = 0
  let maxHeight = await page.evaluate("document.body.scrollHeight")
  while (currHeight < maxHeight) {
    // Scroll to the bottom of the page
    await page.evaluate(`window.scrollTo(0, ${currHeight})`)
    // Wait for page load
    await delay(200)

    currHeight += maxHeight / 100
    maxHeight = await page.evaluate("document.body.scrollHeight")
    // Calculate new scroll height and compare
  }
}

export const addToMongo = async (content) => {
  try {
    Logger.level(1).log("Phase 3️⃣ - Adding to MongoDB.")
    // await connectToDB()
    let prev = await Product.find()
    let counter = {
      added: 0,
      notAdded: 0,
    }
    if (content.length) {
      for (const c of content) {
        if (!c.price && c.store !== "basko") continue
        if (c.price) {
          c.price =
            parseFloat(
              c?.price
                ?.replaceAll("€", "")
                .replaceAll(" ", "")
                .replaceAll(",", ".")
                .trim() || 0
            ) || null
        }

        const found = prev.find(
          (p) => p.prodName === c.prodName && p.store === c.store
        )
        if (!found) {
          Logger.level(3).debug("Added product with name:" + c.prodName)
          counter.added++
          const newProd = new Product(c)
          await newProd.save()
          prev.push(c)
        } else {
          Logger.level(3).debug("Skipped product with name: " + c.prodName)
          counter.notAdded++
        }
      }
    } else {
      const prodNames = prev.map((el) => el.prodName)
      if (!prodNames.includes(content.prodName)) {
        counter.added++
        Logger.level(1).debug("Added product with name: " + content.prodName)
        Logger.debug("prezzo", content.price)
        content.price =
          parseFloat(
            content?.price
              ?.replaceAll("€", "")
              .replaceAll(" ", "")
              .replaceAll(",", ".")
              .trim() || 0
          ) || null
        const newProd = new Product(content)
        await newProd.save()
        prev.push(content)
      } else {
        counter.notAdded++
        Logger.level(1).debug(
          "Skipped product with name: " +
          content.prodName +
          " for reason: already present"
        )
      }
    }
    Logger.level(1).log(
      `Added ${counter.added} products, skipped ${counter.notAdded}. - Total products: ${prev.length}`
    )
    // await mongoose.disconnect()
  } catch (error) {
    Logger.level(1).error(error)
  }
}

