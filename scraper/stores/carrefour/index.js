import { acceptCookies, scrollToBottom, addToMongo } from "../../scraper.utils.js"
import config from "../../scraper.config.json" with {type: "json"}

import { Logger } from "../../../lib/logger.js"
import { Cluster } from "puppeteer-cluster"

const s = config.carrefour

const scrapeCards = async (cards, scadenza, store) => {
  const prods = []
  for (const card of cards) {
    let img = null
    let price = null
    let prodName = null
    let prodQuantity = null
    let needsCard = false
    img = await card.$eval(s.tile, ({ src }) => src)
    const hasPrice = await card.$(s.price)
    if (hasPrice) {
      const priceEl = await card.$eval(
        s.price,
        ({ innerText }) => innerText
      )
      if (priceEl.includes("€")) {
        price = priceEl
      } else continue
    }
    prodName = await card.$eval(
      s.desc,
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
const scrape = async (page, store) => {
  try {
    const lista = await page.$(s.label)
    if (!lista) {
      const titolo = await page.$eval(
        s.h1,
        ({ innerText }) => innerText
      )
      Logger.warning(
        `While scraping for ${store}, a flyer with title ${titolo} was skipped.`
      )
      return
    }
    // Clicca per trasformare il volantino in lista
    await lista?.scrollIntoView()
    await lista?.click()
    // await delay(1000)
    await scrollToBottom(page)

    const hasOrderBy = await page.$(s.search)
    if (hasOrderBy) {
      await page.$eval(s.search, (el) => el.remove())
    }
    let prodotti = []
    // Espande tutti i prodotti
    await expand(page)
    const cards = await page.$$(s.prod)

    const scadenza = await page.$eval(
      s.scadenza,
      ({ innerText }) => `${innerText}/${new Date().getFullYear()}`
    )

    const pageProds = await scrapeCards(cards, scadenza, store)
    prodotti = [...prodotti, ...pageProds]

    addToMongo(prodotti)
  } catch (error) {
    Logger.error(error)
  }
}

const expand = async (page) => {
  try {
    let hasNext = await page.$(s.more)
    while (hasNext) {
      hasNext = await page.$(s.more)
      if (hasNext) {
        await hasNext.scrollIntoView()
        await hasNext.click()
      } else break
    }
  } catch (error) {
    Logger.error(error)
  }
}


const scrapeCarrefour = async (page, name) => {
  try {
    const cluster = await Cluster.launch({
      puppeteerOptions: config.puppeteer,
      // monitor: true,
      maxConcurrency: 2,
      concurrency: Cluster.CONCURRENCY_PAGE
    })

    const volantini = await page.$$eval(s.volantini, (els) => els.map(({ href }) => href))
    console.log(volantini)

    // await scrollToBottom(page)

    await cluster.task(async ({ page, data: url }) => {
      try {
        await page.goto(url)
        await scrape(page, name)
      } catch (error) {
        Logger.error(error)
      }
    })
    for (const url of volantini) {
      await cluster.queue(url)
    }
    await cluster.idle()
    await cluster.close()

  } catch (error) {
    Logger.error(error)
  }
}



export const scrapeCarrefourStores = async () => {
  try {
    const cluster = await Cluster.launch({
      puppeteerOptions: config.puppeteer,
      // monitor: true,
      maxConcurrency: 3,
      concurrency: Cluster.CONCURRENCY_BROWSER
    })

    await cluster.task(async ({ page, data: { url, name } }) => {
      try {
        await page.goto(url)
        await acceptCookies(page, config.cookies.onetrust)
        await scrapeCarrefour(page, name)
      } catch (error) {
        Logger.error(`Failed scraping url: ${url} - ${error.message}`)
      }
    })
    await cluster.queue({
      name: "carrefour-market",
      url: "https://www.carrefour.it/volantino/supermercato-carrefour-market-genova-via-cesarea-12r-14r-16r/4390"
    })
    await cluster.queue({
      name: "carrefour-express",
      url: "https://www.carrefour.it/volantino/supermercato-carrefour-express-genova-via-bologna-94-94-a-r/2467"
    })
    await cluster.idle()
    await cluster.close()
  } catch (error) {
    Logger.error(error)
    throw error
  }
}