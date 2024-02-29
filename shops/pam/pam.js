import fs from "fs";
import puppeteer from "puppeteer";
function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
(async () => {
  try {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate the page to a URL
    await page.goto("https://pam.volantinopiu.com/volantino1613700pv2295.html");

    // Set screen size
    await page.setViewport({ width: 1495, height: 1024 });
    await delay(3000);
    // Type into search box
    //   await page.type('.devsite-search-field', 'automate beyond recorder');

    // const cookie = await page.waitForSelector(
    //   "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll"
    // );
    // if (cookie) {
    //   cookie.click();
    //   console.log("Cookie accettati");
    // }
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
        await delay(500);
        let img = null;
        let price = null;
        let prodName = null;
        let prodQuantity = null;
        let needsCard = false;
        img = await card.$eval("img", ({ src }) => src);

        const priceEl = await card.$(".product-price");
        if (priceEl) {
          price = await card.$eval(".product-price", (el) => el.innerText);
        } else continue;
        prodName = await card.$eval(
          ".card-title",
          ({ innerText }) => innerText
        );
        prodQuantity = await card.$eval(
          ".card-text",
          ({ innerText }) => innerText
        );
        if (await card.$(".meccanica img")) {
          needsCard = await card.$eval(".meccanica img", ({ src }) =>
            src.includes("per_te")
          );
        } else needsCard = false;
        console.log({
          img,
          price,
          prodName,
          prodQuantity,
          store: "pam",
          needsCard,
          scadenza,
        });
        prodotti.push({
          img,
          price,
          prodName,
          prodQuantity,
          store: "pam",
          needsCard,
          scadenza,
        });
      }
      fs.writeFileSync("./pam/pam.json", JSON.stringify(prodotti));
      await browser.close();
    } catch (error) {
      console.log(error);
    }
  } catch (error) {
    console.log(error);
  }
})();
