import puppeteer from "puppeteer"
import Product from "../api/schemas/product.schema.js"
import { Logger } from "../lib/logger.js"
import config from "./scraper.config.json" with {type: "json"}

export function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
  })
}

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
  const cookie = await page.waitForSelector(selector, { timeout: 5000 });
  if (cookie) {
    await cookie.click();
    Logger.log("✅ Cookies accepted");
  } else Logger.warning("⚠️ No cookie banner found or error accepting cookies.");
};


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

export const addToMongoSingle = async (prod) => {
  try {
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
  } catch (error) {
    Logger.error("Error while adding product " + prod.prodName)
  }
}

export const addToMongo = async (content) => {
  try {

    Logger.log("Phase 3️⃣ - Adding to MongoDB.")

    if (!content.length) throw "Content must be an array"

    const operations = content.map((item) => {
      if (!item.price && item.store !== "basko") return null;
      if (typeof item.price !== "number") {

        const cleanedPrice =
          parseFloat(
            item?.price
              ?.replaceAll("€", "")
              .replaceAll(" ", "")
              .replaceAll(",", ".")
              .trim() || 0
          ) || null;

        item.price = cleanedPrice;
      }

      return {
        updateOne: {
          filter: { prodName: item.prodName, store: item.store },
          update: { $setOnInsert: item },
          upsert: true,
        },
      };
    }).filter(Boolean); // remove nulls

    await Product.bulkWrite(operations);

    Logger.log(
      `Products added`
    )
    // await mongoose.disconnect()
  } catch (error) {
    Logger.error(error)
  }
}

