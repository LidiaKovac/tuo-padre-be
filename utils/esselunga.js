import { Logger } from "../shops/logger.js"
import { addToJSONFile, delay, scrollToBottom } from "./index.js"
import path from "path"
export const expandAll = async (page) => {
  try {
    const footer = await page.$("footer")
    let hasClickableButton = await page.$(
      ".load-more-products-btn:not([style])"
    )
    while (hasClickableButton) {
      await delay(100)
      hasClickableButton = await page.$(".load-more-products-btn:not([style])")
      if (!hasClickableButton) break

      await hasClickableButton.scrollIntoView()
      await hasClickableButton.click()
      await footer.scrollIntoView()
      await delay(500)
    }

    await delay(5000)
  } catch (error) {
    console.log(error)

    Logger.error("error while expanding: " + error)
  }
}

export const scrapeVolantino = async (page) => {
  try {
    await Promise.all([scrollToBottom(page), expandAll(page)])
    //   expands all

    const cards = await page.$$(".card-item")
    //   const cards =
    const prodotti = []
    for (const card of cards) {
      let img = null
      let price = null
      let prodName = null
      let prodQuantity = null
      let needsCard = false
      let scadenza = null
      img = await card.$eval("img", ({ src }) => src)
      // await card.waitForSelector(".ws-product-tile__info");
      const priceEl = await card.$(".promo-price")
      if (priceEl) {
        price = await card.$eval(".promo-price", (el) => el.innerText)
      } else {
        const altPrice = await card.$(".meccaniche-wrapper .price")
        if (altPrice)
          price = await card.$eval(
            ".meccaniche-wrapper .price",
            ({ innerText }) => innerText
          )
      }
      if (!price) continue
      prodName = await card.$eval(".card-top p", ({ innerText }) => innerText)

      needsCard = (await card.$(".fidaty")) ? true : false
      scadenza = await page.$eval(
        ".selected-flyer-text-info .date-container",
        ({ innerText }) => innerText
      )
      prodotti.push({
        img,
        price,
        prodName,
        prodQuantity,
        store: "esselunga",
        needsCard,
        scadenza,
      })
    }
    const __dirname = import.meta.dirname
    addToJSONFile(path.resolve(__dirname, "..", "shops","db.json"), prodotti)
    // await delay(10000)
  } catch (error) {
    Logger.error(error)
  }
}
