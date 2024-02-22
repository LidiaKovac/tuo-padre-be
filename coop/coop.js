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
      "https://coop.volantinopiu.com/volantino1607800pv201.html?utm_source=coopliguria.volantinocoop.it&utm_medium=referral"
    );

    // Set screen size
    await page.setViewport({ width: 1495, height: 1024 });

    // Type into search box
    //   await page.type('.devsite-search-field', 'automate beyond recorder');

    const cookie = await page.waitForSelector(
      "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll"
    );
    if (cookie) {
      cookie.click();
      console.log("Cookie accettati");
    }
    setTimeout(async () => {
      try {
        // Wait and click on first result
        const button = await page.waitForSelector(".stats.esplodi");
        await button.click();
        await page.screenshot({ path: "./image.png" });
        console.log("Page opened, waiting for cards...");
        await page.waitForSelector(".card");
        const cards = await page.$$(".card");
        const scadenza = await page.$eval(
          ".barra_laterale .fw-semibold",
          ({ innerText }) => innerText.split("al ")[1].trim()
        );
        const prodotti = [];
        for (const card of cards) {
          let img = null;
          let price = null;
          let prodName = null;
          let prodQuantity = null;
          let needsCard = false
          img = await card.$eval("img", ({ src }) => src);

          const priceEl = await card.$(".product-price");
          if (priceEl) {
            price = await card.$eval(".product-price", (el) => el.innerText);
          }
          prodName = await card.$eval(
            ".card-title",
            ({ innerText }) => innerText
          );
          prodQuantity = await card.$eval(
            ".card-text",
            ({ innerText }) => innerText
          );
          needsCard = await card.$eval(".meccanica img", ({src}) => src.includes("soci"))
          prodotti.push({ img, price, prodName, prodQuantity, store: "coop", needsCard, scadenza });
        }
        fs.writeFileSync("./coop.json", JSON.stringify(prodotti));
        await browser.close();
      } catch (error) {
        console.log(error);
      }
    }, 3000);
  } catch (error) {
    console.log(error);
  }
})();
