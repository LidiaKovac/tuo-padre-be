import { Logger } from "../shops/logger.js"
import { addToMongo, delay, scrollToBottom } from "./index.js"

export const scrapeCards = async (cards, scadenza, store) => {
  const prods = []
  for (const card of cards) {
    let img = null
    let price = null
    let prodName = null
    let prodQuantity = null
    let needsCard = false
    img = await card.$eval(".tile-image", ({ src }) => src)
    const hasPrice = await card.$(".d-prices__final strong")
    if (hasPrice) {
      const priceEl = await card.$eval(
        ".d-prices__final strong",
        ({ innerText }) => innerText
      )
      if (priceEl.includes("€")) {
        price = priceEl
      } else continue
    }
    prodName = await card.$eval(
      "h3.tile-description",
      ({ innerText }) => innerText
    )

    prods.push({
      img,
      price,
      prodName,
      prodQuantity,
      store,
      needsCard,
      scadenza,
    })
  }
  return prods
}
export const scrape = async (page, store) => {
  try {
    const lista = await page.$("label[for='listing']")
    if (!lista) {
      const titolo = await page.$eval(
        "h1.flayers-carousel__title",
        ({ innerText }) => innerText
      )
      Logger.persistent(
        `While scraping for ${store}, a flyer with title ${titolo} was skipped.`
      )
      return
    }
    // Clicca per trasformare il volantino in lista
    await lista?.scrollIntoView()
    await lista?.click()
    await delay(1000)
    await scrollToBottom(page)

    const hasOrderBy = await page.$(".search-orderby")
    if (hasOrderBy) {
      await page.$eval(".search-orderby", (el) => el.remove())
    }
    let prodotti = []
    // Espande tutti i prodotti
    await expand(page)
    await page.waitForSelector(".product")
    const cards = await page.$$(".product")
   
    let hasScadenza = await page.$(".js-flyer-end")
    let scadenza = null
    if (hasScadenza) {
      scadenza = await page.$eval(
        ".js-flyer-end",
        ({ innerText }) => `${innerText}/${new Date().getFullYear()}`
      )
    }
    const pageProds = await scrapeCards(cards, scadenza, store)
    prodotti = [...prodotti, ...pageProds]

    addToMongo(prodotti)
  } catch (error) {
    Logger.error(error)
  }
}

export const expand = async (page) => {
  try {
    let hasNext = await page.$(".btn-show-more")
    while (hasNext) {
      hasNext = await page.$(".btn-show-more")
      if (hasNext) {
        await hasNext.scrollIntoView()
        await hasNext.click()
        await delay(1000)
        // await scrollToBottom(page)
      } else break
    }
  } catch (error) {
    Logger.error(error)
  }
}
