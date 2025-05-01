import { acceptCookies, launchBrowser, addToMongo, scrollToBottom } from "../../scraper.utils.js";
import config from "../../scraper.config.json" with {type: "json"}
import { Logger } from "../../../lib/logger.js"

const s = config.esselunga;

const expandAll = async (page) => {
  try {
    const footer = await page.$(s.footer)
    let hasClickableButton = await page.$(
      s.more
    )
    while (hasClickableButton) {
      hasClickableButton = await page.$(s.more)
      if (!hasClickableButton) break
      await hasClickableButton.scrollIntoView()
      await hasClickableButton.click()
      await footer.scrollIntoView()
    }

  } catch (error) {
    console.log(error)

    Logger.error("error while expanding: " + error)
  }
}

export const scrapeVolantino = async (page) => {
  try {
    await Promise.all([scrollToBottom(page), expandAll(page)])
    //   expands all
    Logger.debug("Scrolling and expansion over")
    const cards = await page.$$(s.card)
    //   const cards =
    const prodotti = []
    for (const card of cards) {
      let img = null
      let price = null
      let prodName = null
      let prodQuantity = null
      let needsCard = false
      let scadenza = null
      prodName = await card.$eval(s.name, ({ innerText }) => innerText)
      Logger.debug(`Scraping card with title: ${prodName}`)
      img = await card.$eval("img", ({ src }) => src)
      // await card.waitForSelector(".ws-product-tile__info");
      const priceEl = await card.$(s.price)
      if (priceEl) {
        price = await card.$eval(s.price, (el) => el.innerText)
      } else {
        const altPrice = await card.$(s.priceAlt)
        if (altPrice)
        price = await card.$eval(s.priceAlt,
      ({ innerText }) => innerText
      )
    }
    
    if (!price) continue
    // await delay(300)
    if (!(await card.$(s.name))) continue
    
    needsCard = (await card.$(s.fidaty)) ? true : false
      scadenza = await page.$eval(
        s.scadenza,
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
    await addToMongo(prodotti)
    return
  } catch (error) {
    Logger.error(error)
  }
}




export const scrapeEsselunga = async () => {
  try {
    const { page, browser } = await launchBrowser(
      "https://www.esselunga.it/",
      "it-it/promozioni/volantini.ben.html"
    );
    await acceptCookies(page, config.cookies.manager);

    // Seleziona tutti i volantini e li apre uno per uno
    const flyers = await page.$$(s.volantino);
    for (let i = 0; i < flyers.length; i++) {
      const flyer = await page.$(`${s.volantino}:nth-of-type(${i + 1})`);
      if (!flyer) continue;
      const btn = await flyer.$eval(s.btn, ({ href }) => href);
      const currPage = await browser.newPage();

      await currPage.goto(btn);
      // await delay(2000)
      await acceptCookies(page, config.cookies.manager);
      Logger.level(1).log("Phase 2️⃣ - Scraping");
      await scrapeVolantino(currPage);
    }

    await browser.close();
  } catch (error) {
    Logger.error(error);
  }
};
