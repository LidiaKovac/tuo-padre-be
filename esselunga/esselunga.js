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
import moment from "moment";
import puppeteer from "puppeteer";
function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

const scrollToBottom = async (page) => {
  let currHeight = 0;
  let maxHeight = await page.evaluate("document.body.scrollHeight");
  console.log("Waiting for scroll...");
  while (currHeight < maxHeight) {
    // Scroll to the bottom of the page
    await page.evaluate(`window.scrollTo(0, ${currHeight})`);
    // Wait for page load
    await delay(100);

    currHeight += 500;
    maxHeight = await page.evaluate("document.body.scrollHeight");
    // Calculate new scroll height and compare
  }
};
const expandAll = async (page) => {
  let firstClickableButton = await page.waitForSelector(
    ".load-more-products-btn:not([style])",
    { visible: true }
  );
  let count = 0;
  while (firstClickableButton) {
    console.log(count);
    await delay(250);
    let hasClickableButton = await page.$(
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
    count++;
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
      await currPage.goto(btn);
      await acceptCookies(currPage);

      //   await currPage.screenshot({ path: "./image.png" });

      const newPrds = await scrapeVolantino(currPage);
      prds = [...prds, ...newPrds]
      await currPage.goto(
        "https://www.esselunga.it/it-it/promozioni/volantini.ben.html"
      );
      console.log("Page ended");
      //   return newPrds;
    }

    fs.writeFileSync(
      "./esselunga/esselunga.json",
      JSON.stringify([...prds, ...toAdd])
    );
    await browser.close();
  } catch (error) {
    console.log(error);
  }
})();
