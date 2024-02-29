// import  cheerio  from "cheerio"
// import {parseFromString} from "dom-parser"
// fetch("https://coop.volantinopiu.com/volantino1607800pv201.html?utm_source=coopliguria.volantinocoop.it&utm_medium=referral")
//     .then((res) => {
//         return res.text()
// }).then((volantino) => {
//    const query =  cheerio.load(volantino)
//    console.log(query(".stats.esplodi").click())
// })

import fs from "fs";
import puppeteer from "puppeteer";

const scrapeCards = async (cards, scadenza, store) => {
  const prods = [];
  for (const card of cards) {
    let img = null;
    let price = null;
    let prodName = null;
    let prodQuantity = null;
    let needsCard = false;
    img = await card.$eval(".tile-image", ({ src }) => src);
    //   await card.waitForSelector(".ws-product-tile__info")
    //   const infoArea = await card.$(".ws-product-tile__info")
    const priceEl = await card.$eval(
      ".d-prices__final strong",
      ({ innerText }) => innerText
    );
    if (priceEl.includes("€")) {
      price = priceEl;
    } else continue;
    prodName = await card.$eval(
      "h3.tile-description",
      ({ innerText }) => innerText
    );
    // prodQuantity = await card.$eval(
    //   ".ws-product-information ul li",
    //   ({ innerText }) => innerText
    // );
    //   needsCard = (await card.$(
    //     ".ws-product-tile-container__discount-info img"
    //   ))
    //     ? true
    //     : false;

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
const carrefourExpress = async () => {
  try {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate the page to a URL
    await page.goto(
      "https://www.carrefour.it/volantino/supermercato-carrefour-express-genova-via-bologna-94-94-a-r/2467/sconti-40-carrefour-express/18096?label=all&prefn1=C4_VolantinoPromoName&prefv1=Sconto"
    );

    // Set screen size
    await page.setViewport({ width: 1495, height: 1024 });

    // Type into search box
    //   await page.type('.devsite-search-field', 'automate beyond recorder');

    const cookie = await page.waitForSelector("#onetrust-accept-btn-handler");
    if (cookie) {
      cookie.click();
      console.log("Cookie accettati");
    }
    setTimeout(async () => {
      try {
        // Wait and click on first result
        // const button = await page.waitForSelector(".stats.esplodi");
        // await button.click();
        let prodotti = [];
        const pageEl = await page.$eval(
          ".grid-footer p.text-center",
          ({ innerText }) => ({
            size: innerText.split("Stai visualizzando ")[1].split("di")[0],
            total: innerText.split("di ")[1].split(" prodotti")[0],
          })
        );
        const totalPages = pageEl.total / pageEl.size;
        for (let i = 0; i <= totalPages; i++) {
          console.log("Page opened, waiting for cards...");
          await page.waitForSelector(".product");
          const cards = await page.$$(".product");
          await page.screenshot({ path: "./image.png" });
          const scadenza = await page.$eval(
            ".js-flyer-end",
            ({ innerText }) => `${innerText}/${new Date().getFullYear()}`
          );
          // const scadenza = await page.$eval(
          //   ".barra_laterale .fw-semibold",
          //   ({ innerText }) => innerText.split("al ")[1].trim()
          // );
          const pageProds = await scrapeCards(
            cards,
            scadenza,
            "carrefour-express"
          );
          prodotti = [...prodotti, ...pageProds];
          const hasNext = await page.$(".btn-show-more");
          if (hasNext) {
            const nextButton = await page.waitForSelector(".btn-show-more");
            await nextButton.click();
          } else break;
        }
        fs.writeFileSync(
          "./carrefour/carrefour.json",
          JSON.stringify(prodotti)
        );
        console.log("Done!");
        await browser.close();
      } catch (error) {
        console.log(error);
      }
    }, 3000);
  } catch (error) {
    console.log(error);
  }
};

const carrefourMarket = async () => {
  try {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate the page to a URL
    await page.goto(
      "https://www.carrefour.it/volantino/supermercato-carrefour-market-genova-via-cesarea-12r-14r-16r/4390"
    );

    // Set screen size
    await page.setViewport({ width: 1495, height: 1024 });

    // Type into search box
    //   await page.type('.devsite-search-field', 'automate beyond recorder');

    const cookie = await page.waitForSelector("#onetrust-accept-btn-handler");
    if (cookie) {
      cookie.click();
      console.log("Cookie accettati");
    }
    setTimeout(async () => {
      try {
        // Wait and click on first result
        // const button = await page.waitForSelector(".stats.esplodi");
        // await button.click();
        let prodotti = [];
        const listView = await page.waitForSelector(".switch-view__label.label--listing")
        listView.click()
        const pageEl = await page.$eval(
          ".grid-footer p.text-center",
          ({ innerText }) => ({
            size: innerText.split("Stai visualizzando ")[1].split("di")[0],
            total: innerText.split("di ")[1].split(" prodotti")[0],
          })
        );
        const totalPages = pageEl.total / pageEl.size;
        for (let i = 0; i <= totalPages; i++) {
          console.log("Page opened, waiting for cards...");
          await page.waitForSelector(".product");
          const cards = await page.$$(".product");
          await page.screenshot({ path: "./image.png" });
          const scadenza = await page.$eval(
            ".js-flyer-end",
            ({ innerText }) => `${innerText}/${new Date().getFullYear()}`
          );
          // const scadenza = await page.$eval(
          //   ".barra_laterale .fw-semibold",
          //   ({ innerText }) => innerText.split("al ")[1].trim()
          // );
          const pageProds = await scrapeCards(
            cards,
            scadenza,
            "carrefour-market"
          );
          prodotti = [...prodotti, ...pageProds];
          const hasNext = await page.$(".btn-show-more");
          if (hasNext) {
            const nextButton = await page.waitForSelector(".btn-show-more");
            await nextButton.click();
          } else break;
        }
        fs.writeFileSync(
          "./carrefour/carrefour.json",
          JSON.stringify(prodotti)
        );
        console.log("Done!");
        await browser.close();
      } catch (error) {
        console.log(error);
      }
    }, 3000);
  } catch (error) {
    console.log(error);
  }
};

Promise.all([carrefourExpress(), carrefourMarket()]);
