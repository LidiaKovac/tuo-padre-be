import { acceptCookies, launchBrowser } from "../../scraper.utils.js";
import config from "../../scraper.config.json" with {type: "json"}

const selector = (...suffix) => {
    return `${config.penny.prefix}${config.penny.product}${suffix.join("")}`
}

export const scrapePenny = async () => {
  try {
    // Launch the browser and open a new blank page
    const { page, browser } = await launchBrowser(
      "https://www.penny.it/",
      "offerte"
    );

    await acceptCookies(page, config.cookies.onetrust);
    const s = config.penny
    const cardsSelector = selector(s.gridList, ` li${s.prefix}${s.card}`) 
    await page.waitForSelector(cardsSelector);
    const cards = await page.$$(cardsSelector);

    Logger.level(1).log("Phase 2️⃣ - Scraping");

    const prodotti = [];
    for (const card of cards) {
      let img = null;
      let price = null;
      let prodName = null;
      let prodQuantity = null;
      let needsCard = false;
      let scadenza = null;
      img = await card.$eval("img", ({ src }) => src);
      const infoAreaSelector = selector(s.tileInfo)
      await card.waitForSelector(infoAreaSelector);
      const infoArea = await card.$(infoAreaSelector);
      const priceSelector = selector(s.price)
      const priceEl = await infoArea.$(priceSelector);
      if (priceEl) {
        price = await infoArea.$eval(
          priceSelector,
          (el) => el.innerText
        );
      }
      prodName = await infoArea.$eval(s.name, ({ innerText }) => innerText);
      prodQuantity = await infoArea.$eval(
        `${selector(s.info)} ul li`,
        ({ innerText }) => innerText
      );
      needsCard = (await card.$(
        `${selector(s.discount)} img`
      ))
        ? true
        : false;
      scadenza = await infoArea.$eval(
        `${selector(s.scadenza)}`,
        ({ innerText }) => innerText.slice(-10)
      );
      prodotti.push({
        img,
        price,
        prodName,
        prodQuantity,
        store: "penny",
        needsCard,
        scadenza,
      });
    }

    await addToMongo(prodotti);
    await browser.close();
  } catch (error) {
    Logger.error(error);
  }
};
