import { Logger } from "../shops/logger.js";
import { addToJSONFile, delay, scrollToBottom } from "./index.js";

export const scrapeCards = async (cards, scadenza, store) => {
  const prods = [];
  for (const card of cards) {
    let img = null;
    let price = null;
    let prodName = null;
    let prodQuantity = null;
    let needsCard = false;
    img = await card.$eval(".tile-image", ({ src }) => src);
    const hasPrice = await card.$(".d-prices__final strong");
    if (hasPrice) {
      const priceEl = await card.$eval(
        ".d-prices__final strong",
        ({ innerText }) => innerText
      );
      if (priceEl.includes("€")) {
        price = priceEl;
      } else continue;
    }
    prodName = await card.$eval(
      "h3.tile-description",
      ({ innerText }) => innerText
    );

    prods.push({
      img,
      price,
      prodName,
      prodQuantity,
      store,
      needsCard,
      scadenza,
    });
  }
  return prods;
};
export const scrape = async (page) => {
  try {
    const lista = await page.$("label[for='listing']");
    await lista?.scrollIntoView();
    await lista?.click();
    await delay(1000);
    const hasOrderBy = await page.$(".search-orderby");
    if (hasOrderBy) {
      await page.$eval(".search-orderby", (el) => el.remove());
    }
    let prodotti = [];
    await scrollToBottom(page)

    const pageEl = await page.$eval(
      ".grid-footer p.text-center",
      ({ innerText }) => ({
        size: parseInt(innerText.split("Stai visualizzando ")[1].split("di")[0]),
        total: parseInt(innerText.split("di ")[1].split(" prodotti")[0]),
      })
    );
    const totalPages = pageEl.total / pageEl.size;
    for (let i = 0; i <= totalPages; i++) {
      await page.waitForSelector(".product");
      const cards = await page.$$(".product");

      const scadenza = await page.$eval(
        ".js-flyer-end",
        ({ innerText }) => `${innerText}/${new Date().getFullYear()}`
      );

      const pageProds = await scrapeCards(cards, scadenza, "carrefour-express");
      prodotti = [...prodotti, ...pageProds];
      const hasNext = await page.$(".btn-show-more");
      if (hasNext) {
        const nextButton = await page.waitForSelector(".btn-show-more");
        await nextButton.click();
        await delay(1000);
      } else break;
    }

    addToJSONFile("./shops/db.json", prodotti);
  } catch (error) {
    Logger.error(error);
  }
};
