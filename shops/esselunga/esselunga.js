import fs from "fs";
import puppeteer from "puppeteer";
import { delay, scrollToBottom } from "../../utils";

const expandAll = async (page) => {
  try {
    let hasClickableButton = await page.$(
      ".load-more-products-btn:not([style])"
    );
    if (hasClickableButton) {
      let firstClickableButton = await page.waitForSelector(
        ".load-more-products-btn:not([style])",
        { visible: true }
      );
      console.log("Expanding, please wait.");
      while (firstClickableButton) {
        await delay(250);
        hasClickableButton = await page.$(
          ".load-more-products-btn:not([style])"
        );
        if (!firstClickableButton) break;
        if (!hasClickableButton) break;

        firstClickableButton = await page.waitForSelector(
          ".load-more-products-btn:not([style])",
          { visible: true }
        );

        // const expandButton = await page.waitForSelector(
        //   ".load-more-products-btn"
        // );

        await firstClickableButton.click();
      }
    }
    console.log("Categories expanded, scraping");
  } catch (error) {
    console.log("Error");
  }
};

const scrapeVolantino = async (page) => {
  // const scadenza = await page.$eval(
  //   ".barra_laterale .fw-semibold",
  //   ({ innerText }) => innerText.split("al ")[1].trim()
  // );
  await scrollToBottom(page);
  //   expands all

  await expandAll(page);
  const cards = await page.$$(".card-item");
  console.log("Found " + cards.length + " cards");
  //   const cards =
  const prodotti = [];
  for (const card of cards) {
    let img = null;
    let price = null;
    let prodName = null;
    let prodQuantity = null;
    let needsCard = false;
    let scadenza = null;
    img = await card.$eval("img", ({ src }) => src);
    // await card.waitForSelector(".ws-product-tile__info");
    const priceEl = await card.$(".promo-price");
    if (priceEl) {
      price = await card.$eval(".promo-price", (el) => el.innerText);
    } else {
      const altPrice = await card.$(".meccaniche-wrapper .price");
      if (altPrice)
        price = await card.$eval(
          ".meccaniche-wrapper .price",
          ({ innerText }) => innerText
        );
    }
    if (!price) continue;
    prodName = await card.$eval(".card-top p", ({ innerText }) => innerText);

    needsCard = (await card.$(".fidaty")) ? true : false;
    scadenza = await page.$eval(
      ".selected-flyer-text-info .date-container",
      ({ innerText }) => innerText
    );
    prodotti.push({
      img,
      price,
      prodName,
      prodQuantity,
      store: "esselunga",
      needsCard,
      scadenza,
    });
    console.log("Product added");
  }
  await page.goto(
    "https://www.esselunga.it/it-it/promozioni/volantini.ben.html"
  );
  return prodotti;
};
const acceptCookies = async (page) => {
  const hasCookies = await page.$(
    ".cookie-manager-container-wrapper .btn btn-blue-primary.accept-all-btn"
  );
  if (hasCookies) {
    const cookie = await page.waitForSelector(
      ".cookie-manager-container-wrapper .btn btn-blue-primary.accept-all-btn"
    );
    cookie.click();
    console.log("Cookie accettati");
  }
};
(async () => {
  try {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate the page to a URL
    await page.goto(
      "https://www.esselunga.it/it-it/promozioni/volantini.ben.html"
    );

    // Set screen size
    await page.setViewport({ width: 1795, height: 1024 });

    // Type into search box
    //   await page.type('.devsite-search-field', 'automate beyond recorder');
    await acceptCookies(page);

    await delay(1000);
    // Wait and click on first result
    // const button = await page.waitForSelector(".stats.esplodi");
    // await button.click();
    console.log("Page opened, waiting for cards...");
    const flyers = await page.$$(".single-flyer");
    let prds = JSON.parse(fs.readFileSync("./esselunga/esselunga.json"));
    for (const flyer of flyers) {
      console.log("Page started");
      const btn = await flyer.$eval(
        ".btn-blue-primary.flyer-btn",
        ({ href }) => href
      );

      const currPage = await browser.newPage();
      await currPage.setViewport({ width: 1795, height: 1024 });

      await currPage.goto(btn);
      await acceptCookies(currPage);

      //   await currPage.screenshot({ path: "./image.png" });

      const newPrds = await scrapeVolantino(currPage);
      prds = [...prds, ...newPrds];
      await currPage.goto(
        "https://www.esselunga.it/it-it/promozioni/volantini.ben.html"
      );
      console.log("Page ended");
      //   return newPrds;
    }

    fs.writeFileSync("./esselunga/esselunga.json", JSON.stringify(prds));
    await browser.close();
  } catch (error) {
    console.log(error);
  }
})();
