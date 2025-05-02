import puppeteer from "puppeteer"
import Product from "../api/schemas/product.schema.js"
import { Logger } from "../lib/logger.js"
import config from "./scraper.config.json" with {type: "json"}
/* 

  TODO: make basko easier, cleaner and lighter

  TODO: deploy as a background process
  TODO: add autopush 

  TODO: move basko to suggestions
  TODO: penny images
*/

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
  try {
    const cookie = await page.waitForSelector(selector, { timeout: 5000 });
    if (cookie) {
      await cookie.click();
      Logger.log("✅ Cookies accepted");
    }
  } catch (error) {
    Logger.warning("⚠️ No cookie banner found or error accepting cookies.");
  }
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

export const scrapeVolatinoPiu = async ({ page, shopName }) => {
  try {
    await delay(1500)
    //!using a delay so that the page can fully render. 
    //!rendering of SPAs seems a little bit weird, we might want to
    //!condisder switchning to another library in the future
    const modal = await page.$(".modal.show")
    if (modal) {
      await modal.evaluate(e => e.style.display = "none");
      const backdrop = await page.$(".modal-backdrop.fade.show");
      if (backdrop) {
        await backdrop.evaluate(el => el.remove());
      }
    } else Logger.log("Didn't find a modal. Proceeding.")

    const selectors = config.volantinoPiu;
    await delay(1000)
    const button = await page.$(selectors.button)
    if (!button) {
      //button is disabled
      Logger.warning("🔨 Skipping flyer - li.esplodi doesn't exist");
      return
    } else {
      await button.click({ delay: 2000 })
      await button.click()
    }

    await page.waitForSelector(selectors.card)
    const cards = await page.$$(selectors.card)
    const scadenza = await page.$eval(selectors.scadenza, el =>
      el.innerText.split(" al ")[1].trim()
    );

    const prodotti = [];
    for (const card of cards) {
      const img = await card.$eval(selectors.img, el => el.src);

      let price = null;
      const priceEl = await card.$(selectors.price);
      if (priceEl) {
        price = await card.$eval(selectors.price, el => el.innerText);
      }

      const prodName = await card.$eval(`${selectors.card}${selectors.name}`, el => el.innerText);
      const prodQuantity = await card.$eval(`${selectors.card}${selectors.name}`, el => el.innerText);

      let needsCard = false;
      const cardImg = await card.$(selectors.needsCard);
      if (cardImg) {
        const src = await cardImg.evaluate(el => el.src);
        if (shopName === "pam") {
          needsCard = src.includes("per_te");
        } else if (shopName === "coop") {
          needsCard = src.includes("soci");
        }
      }

      prodotti.push({
        img,
        price,
        prodName,
        prodQuantity,
        store: shopName,
        needsCard,
        scadenza,
      });
    }

    await addToMongo(prodotti);
  } catch (error) {
    Logger.error("❌ scrapeVolatinoPiu failed: " + error.message);
  }
};


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
    }

    const operations = content.map((item) => {
      if (!item.price && item.store !== "basko") return null;
      if(typeof item.price !== "number") {

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

