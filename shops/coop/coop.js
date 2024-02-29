import fs from "fs";
import puppeteer from "puppeteer";
import { delay } from "../../utils";

(async () => {
  try {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    const context = browser.defaultBrowserContext();
    await context.overridePermissions("https://volantinocoop.it/", [
      "geolocation",
    ]);
    // Navigate the page to a URL
    await page.goto("https://volantinocoop.it/cerca");
    // Set screen size
    // await page.setViewport({ width: 1495, height: 1024 });
    await page.setGeolocation({ latitude: 44.414165, longitude: 8.942184 });
    await page.type("#pac-input", "genova");

    await delay(1000);
    await page.waitForSelector("button#submit");
    const sub = await page.$("button#submit");
    await sub.scrollIntoView();
    await sub.click();
    console.log("Clicking");

    // await delay(4000);
    const shop = await page.waitForSelector(".list-menu .item");
    await shop.click();
    console.log("Clicking shop");
    // Type into search box
    await delay(3000);
    await page.reload();
    const cookie = await page.waitForSelector(
      "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll"
    );
    if (cookie) {
      await cookie.click();
      console.log("Cookie accettati");
    }
    // Wait and click on first result
    await delay(3000);
    await page.screenshot({ path: "./image.png" });
    console.log("Screenshot made");
    const button = await page.waitForSelector(".esplodi", { visible: true });
    await button.click();
    console.log("Page opened, waiting for cards...");
    await page.waitForSelector(".card");
    console.log
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
      let needsCard = false;
      img = await card.$eval("img", ({ src }) => src);

      const priceEl = await card.$(".product-price");
      if (priceEl) {
        price = await card.$eval(".product-price", (el) => el.innerText);
      }
      prodName = await card.$eval(".card-title", ({ innerText }) => innerText);
      prodQuantity = await card.$eval(
        ".card-text",
        ({ innerText }) => innerText
      );
      needsCard = await card.$eval(".meccanica img", ({ src }) =>
        src.includes("soci")
      );
      prodotti.push({
        img,
        price,
        prodName,
        prodQuantity,
        store: "coop",
        needsCard,
        scadenza,
      });
    }
    fs.writeFileSync("./coop/coop.json", JSON.stringify(prodotti));
    await browser.close();
  } catch (error) {
    console.log(error);
  }
})();
