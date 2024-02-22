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

(async () => {
  try {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate the page to a URL
    await page.goto(
      "https://www.lidl.it/c/offerte-settimanali-kw-08/a10039833?channel=store&tabCode=Current_Sales_Week"
    );

    // Set screen size
    await page.setViewport({ width: 1495, height: 1024 });

    // Type into search box
    //   await page.type('.devsite-search-field', 'automate beyond recorder');
// role="gridcell"
    const cookie = await page.waitForSelector(
      "#onetrust-accept-btn-handler"
    );
    if (cookie) {
      cookie.click();
      console.log("Cookie accettati");
    }
    setTimeout(async () => {
      try {
        // Wait and click on first result
        // const button = await page.waitForSelector(".stats.esplodi");
        // await button.click();
        console.log("Page opened, waiting for cards...");
        await page.waitForSelector(".ws-product-grid__list li.ws-card");
        const cards = await page.$$(".ws-product-grid__list li.ws-card");
        await page.screenshot({ path: "./image.png" });
        // const scadenza = await page.$eval(
        //   ".barra_laterale .fw-semibold",
        //   ({ innerText }) => innerText.split("al ")[1].trim()
        // );
        const prodotti = [];
        for (const card of cards) {
          let img = null;
          let price = null;
          let prodName = null;
          let prodQuantity = null;
          let needsCard = false
          let scadenza = null
          img = await card.$eval("img", ({ src }) => src);
          await card.waitForSelector(".ws-product-tile__info")
          const infoArea = await card.$(".ws-product-tile__info")
          const priceEl = await infoArea.$(".ws-product-price-type__value");
          if (priceEl) {
              price = await infoArea.$eval(".ws-product-price-type__value", (el) => el.innerText);
            }
            prodName = await infoArea.$eval(
                "h3 span",
            ({ innerText }) => innerText
          );
          prodQuantity = await infoArea.$eval(
            ".ws-product-information ul li",
            ({ innerText }) => innerText
          );
          needsCard = await card.$(".ws-product-tile-container__discount-info img") ? true : false
          scadenza = await infoArea.$eval(".ws-product-price-validity span:last-of-type", ({innerText}) => innerText.slice(-10) )
          prodotti.push({ img, price, prodName, prodQuantity, store: "penny", needsCard, scadenza });
        }
        fs.writeFileSync("./penny.json", JSON.stringify(prodotti));
        await browser.close();
      } catch (error) {
        console.log(error);
      }
    }, 3000);
  } catch (error) {
    console.log(error);
  }
})();
