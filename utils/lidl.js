import { addToMongo, scrollToBottom } from "./index.js"
import { Logger } from "../shops/logger.js"

export const scrapeCategory = async (page) => {
  try {
    const prodotti = []

    await scrollToBottom(page)
    await page.waitForSelector(".ACampaignGrid__item--product")
    const cards = await page.$$(".ACampaignGrid__item--product")
    for (const card of cards) {
      let img = null
      let price = null
      let prodName = null
      let prodQuantity = null
      let needsCard = false
      let scadenza = null
      const nav = await page.$("nav")
      await nav.scrollIntoView()
      await page.waitForSelector(".product-grid-box")
      await card.waitForSelector(".product-grid-box__image")
      img = await card.$eval(".product-grid-box__image", ({ src }) => src)
      price = await card.$eval(".m-price__price--small", (el) => el.innerText)
      prodName = await card.$eval(
        ".grid-box__headline",
        ({ innerText }) => innerText
      )
      if (!(await card.$(".price-footer small"))) {
        prodQuantity = null
      } else {
        prodQuantity = await card.$eval(
          ".price-footer small",
          ({ innerText }) => innerText
        )
        const hasExpiryDate = await card.$(
          ".product-grid-box__label-wrapper .label__text"
        )
        if (hasExpiryDate) {
          scadenza = await card.$eval(
            ".product-grid-box__label-wrapper .label__text",
            ({ innerText }) => innerText
          )
        }

        prodotti.push({
          img,
          price,
          prodName,
          prodQuantity,
          store: "lidl",
          needsCard,
          scadenza,
        })
      }
    }

    addToMongo(prodotti)
  } catch (error) {
    Logger.error(error)
  }
}
