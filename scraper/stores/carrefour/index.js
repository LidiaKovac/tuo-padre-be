import { acceptCookies, launchBrowser, scrollToBottom, addToMongo } from "../../scraper.utils.js"
import config from "../../scraper.config.json" with {type: "json"}

import { Logger } from "../../../lib/logger.js"

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
      Logger.persistent(
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
    await page.waitForSelector(s.prod)
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


const scrapeCarrefour = async(page, name) => {
    try {
        

        await scrollToBottom(page)
        // Seleziona tutti i volantini in cima alla pagina
        const volantini = await page.$$(s.volantini)
        for (let i = 1; i <= volantini.length; i++) {
          const volantino = await volantini[i - 1].$eval(
            s.link,
            ({ href }) => href
          )
          if (!volantino) continue
          const curr = await browser.newPage()
          await curr.goto(volantino)
          Logger.level(1).log("Phase 2️⃣ - Scraping")
          await scrape(curr, name)
        }
        await browser.close()
      } catch (error) {
        Logger.error(error)
      }
}



export const scrapeCarrefourStores = async() => {
    try {
        const { page, browser } = await launchBrowser(
            "https://www.carrefour.it/",
            "/volantino/supermercato-carrefour-express-genova-via-bologna-94-94-a-r/2467"
          )
          
          await acceptCookies(page, config.cookies.onetrust)
        await scrapeCarrefour(page, "carrefour-express")
        await browser.close()
        const { pageM, browserM } = await launchBrowser(
            "https://www.carrefour.it/",
            "volantino/supermercato-carrefour-market-genova-via-cesarea-12r-14r-16r/4390"
          )
          await scrapeCarrefour(pageM, "carrefour-market")
          await browserM.close()
    } catch (error) {
        Logger.error(error)
        throw error
    }
}