import fs from "fs";
import puppeteer from "puppeteer";
import { delay } from "../../utils";

const scrapeCategory = async (page) => {
  try {
    const prodotti = [];
    // const [newPage] = await Promise.all([cat.click(), await page.waitForNavigation()]);
    console.log("Categoria cliccata");
    await page.screenshot({ path: "./image.png" });
    let currHeight = 0;
    let maxHeight = await page.evaluate("document.body.scrollHeight");
    console.log("Waiting for scroll...");
    while (currHeight < maxHeight) {
      // Scroll to the bottom of the page
      await page.evaluate(`window.scrollTo(0, ${currHeight})`);
      // Wait for page load
      await delay(1000);

      currHeight += 500;
      // Calculate new scroll height and compare
    }
    // Wait and click on first result
    // const button = await page.waitForSelector(".stats.esplodi");
    // await button.click();
    await page.waitForSelector(".ACampaignGrid__item--product");
    const cards = await page.$$(".ACampaignGrid__item--product");
    // const scadenza = await page.$eval(
    //   ".barra_laterale .fw-semibold",
    //   ({ innerText }) => innerText.split("al ")[1].trim()
    // );
    const oldProds = JSON.parse(fs.readFileSync("./lidl.json", "utf-8"));

    for (const card of cards) {
      let img = null;
      let price = null;
      let prodName = null;
      let prodQuantity = null;
      let needsCard = false;
      let scadenza = null;

      await page.waitForSelector(".product-grid-box ");
      await card.waitForSelector(".product-grid-box__image");
      img = await card.$eval(".product-grid-box__image", ({ src }) => src);
      // await card.waitForSelector(".ws-product-tile__info");
      // const infoArea = await card.$(".ws-product-tile__info");
      // const priceEl = await card.$(".price-footer small");
      // if (priceEl) {
      price = await card.$eval(".m-price__price--small", (el) => el.innerText);
      // }
      prodName = await card.$eval(
        ".grid-box__headline",
        ({ innerText }) => innerText
      );
      prodQuantity = await card.$eval(
        ".price-footer small",
        ({ innerText }) => innerText
      );
      //   needsCard = (await card.$(
      //     ".ws-product-tile-container__discount-info img"
      // ))
      //   ? true
      //   : false;
      scadenza = await card.$eval(
        ".product-grid-box__label-wrapper .label__text",
        ({ innerText }) => innerText
      );

      if (oldProds.map((p) => p.prodName).includes(prodName)) continue;
      prodotti.push({
        img,
        price,
        prodName,
        prodQuantity,
        store: "lidl",
        needsCard,
        scadenza,
      });
    }
    console.log(prodotti);
    fs.writeFileSync("./lidl.json", JSON.stringify([...oldProds, ...prodotti]));
  } catch (error) {
    console.log(error);
  }
};

(async () => {
  try {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({ headless: false });
    let page = await browser.newPage();

    // Navigate the page to a URL
    await page.goto("https://www.lidl.it");

    // Set screen size
    await page.setViewport({ width: 1495, height: 1024 });

    // Type into search box
    //   await page.type('.devsite-search-field', 'automate beyond recorder');
    // role="gridcell"
    const cookie = await page.waitForSelector("#onetrust-accept-btn-handler");
    if (cookie) {
      cookie.click();
      console.log("Cookie accettati");
    }
    const linkToSales = await page.waitForSelector(
      ".n-header__main-navigation-link--sale"
    );
    linkToSales.click();
    setTimeout(async () => {
      const bigCard = await page.waitForSelector(".AHeroStageItems__Item");

      bigCard.click();
      await page.waitForSelector(".ATheHeroStage__Offer");
      const categories = await page.$$eval(
        "#ATheHeroStage__Toggable83968991 .ATheHeroStage__Offer .ATheHeroStage__OfferAnchor",
        (aTags) => aTags.map((a) => a.href)
      );
      console.log("Page opened,clicking categories...");
      for (const cat of categories) {
        console.log("Entering category");
        await page.goto(cat);
        // await page.waitForNavigation();
        await scrapeCategory(page);
      }
      await browser.close();
    }, 3000);
  } catch (error) {
    console.log(error);
  }
})();
