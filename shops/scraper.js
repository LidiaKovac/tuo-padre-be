import { writeFileSync } from "fs";
import puppeteer from "puppeteer";
import { addToJSONFile, delay, scrollToBottom } from "../utils/index.js";
import { scrape } from "../utils/carrefour.js";
import { Logger } from "./logger.js";
import moment from "moment";

export class Scraper {
  //   General
  static async launchBrowser(baseUrl, endpoint) {
    const browser = await puppeteer.launch({
      // headless: false,
      // args: ["--start-maximized"],
    });
    const page = await browser.newPage();

    await page.setViewport({ width: 1366, height: 768 });
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(baseUrl, ["geolocation"]);
    // Navigate the page to a URL
    await page.goto(baseUrl + endpoint);
    // Set screen size
    // await page.setViewport({ width: 1495, height: 1024 });
    await page.setGeolocation({ latitude: 44.414165, longitude: 8.942184 });
    return { page, browser };
  }
  static async acceptCookies(page, selector) {
    try {
      await delay(1000);
      const hasCookie = await page.$(selector);
      Logger.log("Accepting cookies");
      if (hasCookie) {
        const cookie = await page.waitForSelector(selector);
        await cookie.click();
      }
      Logger.log("Cookies accepted");
    } catch (error) {
      Logger.error("Error accepting cookies: " + error);
    }
  }
  //   Common to more shops
  static async scrapeVolantinoPiu({ page, shopName }) {
    try {
      await page.reload();

      // Wait and click on first result
      await delay(3000);
      await page.screenshot({ path: `./images/image-${shopName}.png` });
      const button = await page.waitForSelector(".esplodi", { visible: true });
      await button.click();
      Logger.log("Page opened, waiting for cards...");
      await page.waitForSelector(".card");
      const cards = await page.$$(".card");
      const scadenza = await page.$eval(
        ".barra_laterale .fw-semibold",
        ({ innerText }) => innerText.split(" al ")[1].trim()
      );
      Logger.log("Scanning products");
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
        prodName = await card.$eval(
          ".card-title",
          ({ innerText }) => innerText
        );
        prodQuantity = await card.$eval(
          ".card-text",
          ({ innerText }) => innerText
        );
        if (await card.$(".meccanica img")) {
          if (shopName === "pam") {
            needsCard = await card.$eval(".meccanica img", ({ src }) =>
              src.includes("per_te")
            );
          }
          if (shopName === "coop") {
            needsCard = await card.$eval(".meccanica img", ({ src }) =>
              src.includes("soci")
            );
          }
        } else needsCard = false;
        prodotti.push({
          img,
          price,
          prodName,
          prodQuantity,
          store: shopName,
          needsCard,
          scadenza,
        });
      }
      Logger.log("Products scanned, writing on file");

      addToJSONFile("./shops/db.json", prodotti);
    } catch (error) {
      Logger.error(error);
    }
  }
  //   !Shops
  static async scrapeCoop() {
    // Launch the browser and open a new blank page
    const { page, browser } = await this.launchBrowser(
      "https://volantinocoop.it/",
      "cerca"
    );
    this.acceptCookies(
      page,
      "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll"
    );
    await page.type("#pac-input", "genova");

    await delay(1000);
    await page.waitForSelector("button#submit");
    const sub = await page.$("button#submit");
    await sub.scrollIntoView();
    await sub.click();
    Logger.log("Clicking");
    const shop = await page.waitForSelector(".list-menu .item");
    await shop.click();
    Logger.log("Clicking shop");
    // Type into search box
    await delay(3000);
    await this.scrapeVolantinoPiu({
      page,
      shopName: "coop",
    });
    await browser.close();
  }
  static async scrapePam() {
    const { page, browser } = await this.launchBrowser(
      "https://www.pampanorama.it/",
      "punti-vendita/genova-lagaccio"
    );
    await this.acceptCookies(page, "#cookiePopupSave");
    await page.waitForSelector(".storeFlyer img[src*='volantinopiu']");
    let counter = await page.$$eval(
      ".storeFlyer img[src*='volantinopiu']",
      ({ length }) => length
    );
    for (let i = 1; i <= counter; i++) {
      Logger.log(counter);
      const volantino = await page.$(`.storeFlyer:nth-of-type(${i})`);
      if (volantino && volantino.$("img[src*='volantinopiu']")) {
        Logger.log("Starting flyer");
        await volantino.click();
        await page.reload();
        await this.scrapeVolantinoPiu({
          page,
          shopName: "pam",
        });
        Logger.log("Flyer completed, moving on to next...");

        await page.goBack();
        await delay(3000);
      }
    }
    await browser.close();
  }
  static async scrapePenny() {
    try {
      // Launch the browser and open a new blank page
      const { page, browser } = await this.launchBrowser(
        "https://www.penny.it/",
        "offerte"
      );

      await this.acceptCookies(page, "#onetrust-accept-btn-handler");
      await delay(3000);
      await page.waitForSelector(".ws-product-grid__list li.ws-card");
      const cards = await page.$$(".ws-product-grid__list li.ws-card");
      await page.screenshot({ path: `./images/image-penny.png` });

      const prodotti = [];
      for (const card of cards) {
        let img = null;
        let price = null;
        let prodName = null;
        let prodQuantity = null;
        let needsCard = false;
        let scadenza = null;
        img = await card.$eval("img", ({ src }) => src);
        await card.waitForSelector(".ws-product-tile__info");
        const infoArea = await card.$(".ws-product-tile__info");
        const priceEl = await infoArea.$(".ws-product-price-type__value");
        if (priceEl) {
          price = await infoArea.$eval(
            ".ws-product-price-type__value",
            (el) => el.innerText
          );
        }
        prodName = await infoArea.$eval(
          "h3 span",
          ({ innerText }) => innerText
        );
        prodQuantity = await infoArea.$eval(
          ".ws-product-information ul li",
          ({ innerText }) => innerText
        );
        needsCard = (await card.$(
          ".ws-product-tile-container__discount-info img"
        ))
          ? true
          : false;
        scadenza = await infoArea.$eval(
          ".ws-product-price-validity span:last-of-type",
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
      addToJSONFile("./shops/db.json", prodotti);
      await browser.close();
    } catch (error) {
      Logger.error(error);
    }
  }
  static async scrapeCarrefourExpress() {
    try {
      const { page, browser } = await this.launchBrowser(
        "https://www.carrefour.it/",
        "/volantino/supermercato-carrefour-express-genova-via-bologna-94-94-a-r/2467"
      );

      await this.acceptCookies(page, "#onetrust-accept-btn-handler");

      await delay(3000);
      await scrollToBottom(page);
      const volantini = await page.$$(".card.card--carousel:not(.promoclick)");
      for (let i = 1; i <= volantini.length; i++) {
        const volantino = await page.$(
          `.glide__slide:not(li .promoclick):has(.card):nth-of-type(${i})`
        );
        if (!volantino) continue;
        await volantino.scrollIntoView();
        await volantino.click();
        await delay(3000);
        await scrape(page);
        Logger.log("Flyer no " + i + "  done.");
      }
      await browser.close();
    } catch (error) {
      Logger.error(error);
    }
  }
  static async scrapeCarrefourMarket() {
    try {
      const { page, browser } = await this.launchBrowser(
        "https://www.carrefour.it/",
        "volantino/supermercato-carrefour-market-genova-via-cesarea-12r-14r-16r/4390"
      );

      await this.acceptCookies(page, "#onetrust-accept-btn-handler");

      await delay(3000);

      const volantini = await page.$$(".card.card--carousel:not(.promoclick)");
      for (let i = 1; i <= volantini.length; i++) {
        const volantino = await page.$(
          `.glide__slide:not(li .promoclick):has(.card):nth-of-type(${i})`
        );
        if (!volantino) continue;
        await volantino.scrollIntoView();
        await volantino.click();
        await delay(3000);
        await scrape(page);
        Logger.log("Flyer no " + i + " done.");
      }
      await browser.close();
    } catch (error) {
      Logger.error(error);
    }
  }
  static async scrapeEsselunga() {
    try {
      const { page, browser } = await this.launchBrowser(
        "https://www.esselunga.it/",
        "it-it/promozioni/volantini.ben.html"
      );
      await this.acceptCookies(
        page,
        ".cookie-manager-container-wrapper .btn.btn-blue-primary.accept-all-btn"
      );

      await delay(1000);

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
            while (firstClickableButton) {
              await delay(100);
              hasClickableButton = await page.$eval(
                ".load-more-products-btn:not([style])",
                (el) => (el.style?.display ? null : el)
              );
              if (!firstClickableButton) break;
              if (!hasClickableButton) continue;

              firstClickableButton = await page.waitForSelector(
                ".load-more-products-btn:not([style])",
                { visible: true }
              );

              // const expandButton = await page.waitForSelector(
              //   ".load-more-products-btn"
              // );

              await firstClickableButton.click();
              await delay(500);
            }
          }
          await delay(5000);
        } catch (error) {
          Logger.error("error while expanding: " + error);
        }
      };

      const scrapeVolantino = async (page) => {
        try {
          await Promise.all([scrollToBottom(page), expandAll(page)]);
          //   expands all

          const cards = await page.$$(".card-item");
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
            prodName = await card.$eval(
              ".card-top p",
              ({ innerText }) => innerText
            );

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
          }
          Logger.log("Flyer done.");
          // await delay(10000)
          await page.goto(
            "https://www.esselunga.it/it-it/promozioni/volantini.ben.html"
          );
          return prodotti;
        } catch (error) {
          Logger.error(error);
        }
      };

      const flyers = await page.$$(".single-flyer");
      let prds = [];
      for (const flyer of flyers) {
        const btn = await flyer.$eval(
          ".btn-blue-primary.flyer-btn",
          ({ href }) => href
        );

        const currPage = await browser.newPage();

        await currPage.goto(btn);
        await delay(2000);
        await this.acceptCookies(
          page,
          ".cookie-manager-container-wrapper .btn btn-blue-primary.accept-all-btn"
        );

        const newPrds = await scrapeVolantino(currPage);
        prds = [...prds, ...newPrds];
        await currPage.goto(
          "https://www.esselunga.it/it-it/promozioni/volantini.ben.html"
        );
        await this.acceptCookies(
          page,
          ".cookie-manager-container-wrapper .btn btn-blue-primary.accept-all-btn"
        );
        Logger.log("Flyer done.");
        addToJSONFile("./shops/db.json", prds);
        //   return newPrds;
      }

      await browser.close();
    } catch (error) {
      Logger.error(error);
    }
  }
  static async scrapeLidl() {
    try {
      // Launch the browser and open a new blank page
      const { page, browser } = await this.launchBrowser(
        "https://www.lidl.it",
        "/"
      );

      const scrapeCategory = async (page) => {
        try {
          const prodotti = [];
          await page.screenshot({ path: `./images/image-lidl.png` });

          await scrollToBottom(page);
          await page.waitForSelector(".ACampaignGrid__item--product");
          const cards = await page.$$(".ACampaignGrid__item--product");
          for (const card of cards) {
            let img = null;
            let price = null;
            let prodName = null;
            let prodQuantity = null;
            let needsCard = false;
            let scadenza = null;

            await page.waitForSelector(".product-grid-box ");
            await card.waitForSelector(".product-grid-box__image");
            img = await card.$eval(
              ".product-grid-box__image",
              ({ src }) => src
            );
            price = await card.$eval(
              ".m-price__price--small",
              (el) => el.innerText
            );
            prodName = await card.$eval(
              ".grid-box__headline",
              ({ innerText }) => innerText
            );
            prodQuantity = await card.$eval(
              ".price-footer small",
              ({ innerText }) => innerText
            );
            const hasExpiryDate = await card.$(
              ".product-grid-box__label-wrapper .label__text"
            );
            if (hasExpiryDate) {
              scadenza = await card.$eval(
                ".product-grid-box__label-wrapper .label__text",
                ({ innerText }) => innerText
              );
            }

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
          Logger.log("Flyer done.");

          addToJSONFile("./shops/db.json", prodotti);
        } catch (error) {
          Logger.error(error);
        }
      };

      await this.acceptCookies(page, "#onetrust-accept-btn-handler");

      const linkToSales = await page.waitForSelector(
        ".n-header__main-navigation-link--sale"
      );
      await linkToSales.click();
      await delay(3000);
      const bigCard = await page.waitForSelector(".AHeroStageItems__Item");

      await bigCard.click();
      await page.waitForSelector(".ATheHeroStage__Offer");
      const categories = await page.$$eval(
        "div[role='row']:first-of-type .ATheHeroStage__Offer .ATheHeroStage__OfferAnchor",
        (aTags) => aTags.map((a) => a.href)
      );
      for (const cat of categories) {
        await page.goto(cat);
        // await page.waitForNavigation();
        await scrapeCategory(page);
      }
      await browser.close();
    } catch (error) {
      Logger.error(error);
    }
  }

  static async scrapeAll() {
    try {


      writeFileSync("./shops/db.json", "[]");
      Logger.log("Scraping has started...");
      const startTime = new Date();
      Logger.log("Scraping Carrefour Express: ");
      await this.scrapeCarrefourExpress();
      Logger.log("Time elapsed: " + moment(startTime).fromNow());
      Logger.log("Scraping Carrefour Market: ");
      await this.scrapeCarrefourMarket();
      Logger.log("Time elapsed: " + moment(startTime).fromNow());
      Logger.log("Scraping COOP: ");
      await this.scrapeCoop();
      Logger.log("Time elapsed: " + moment(startTime).fromNow());
      Logger.log("Scraping Esselunga: ");
      await this.scrapeEsselunga();
      Logger.log("Time elapsed: " + moment(startTime).fromNow());
      Logger.log("Scraping Pam: ");
      await this.scrapePam();
      Logger.log("Time elapsed: " + moment(startTime).fromNow());
      Logger.log("Scraping Penny: ");
      await this.scrapePenny();
      Logger.log("Scraping has ended.");
      Logger.log("Time elapsed: " + moment(startTime).fromNow());
    } catch (error) {
      Logger.error(error)
    }
  }
}

Scraper.scrapeAll()
