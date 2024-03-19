import { readFileSync, writeFileSync } from "fs";
import puppeteer from "puppeteer";
import { v2 as cloudinary } from "cloudinary"

import { addToJSONFile, configCloudinary, delay, scrollToBottom } from "../utils/index.js";
import { scrape } from "../utils/carrefour.js";
import { Logger } from "./logger.js";
import moment from "moment";
import { scrapeVolantino } from "../utils/esselunga.js";
import { scrapeCategory } from "../utils/lidl.js";
import path from "path";
import { cleanup, uploadImages, upscaleAndCrop } from "../utils/basko.js";
import { readdir } from "fs/promises";
import { createWorker } from "tesseract.js";

const __dirname = import.meta.dirname

export class Scraper {
  browser;
  //   General
  static async launchBrowser(baseUrl, endpoint) {
    Logger.level(1).log("Phase 1️⃣ - Navigating browser");

    const browser = await puppeteer.launch({
      // headless: false,
      // args: ["--start-maximized"],
    });
    this.browser = browser;
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
      if (hasCookie) {
        const cookie = await page.waitForSelector(selector);
        await cookie.click();
      }
    } catch (error) {
      Logger.error("   Error accepting cookies: " + error);
    }
  }
  //   Common to more shops
  static async scrapeVolantinoPiu({ page, shopName }) {
    try {
      await page.reload();

      // Wait and click on first result
      await delay(3000);
      const button = await page.waitForSelector(".esplodi", { visible: true });
      await button.click();
      await page.waitForSelector(".card");
      const cards = await page.$$(".card");
      const scadenza = await page.$eval(
        ".barra_laterale .fw-semibold",
        ({ innerText }) => innerText.split(" al ")[1].trim()
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

      addToJSONFile(path.resolve(__dirname, "db.json"), prodotti);
    } catch (error) {
      Logger.error(error);
    }
  }
  //   !Shops
  static async scrapeCoop() {
    try {
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
      const shop = await page.waitForSelector(".list-menu .item");
      await shop.click();
      // Type into search box
      await delay(3000);
      Logger.level(1).log("Phase 2️⃣ - Scraping");
      await this.scrapeVolantinoPiu({
        page,
        shopName: "coop",
      });
      await browser.close();
    } catch (error) {
      Logger.error(error);
    }
  }
  static async scrapePam() {
    try {
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
        const volantino = await page.$(`.storeFlyer:nth-of-type(${i})`);
        if (volantino && volantino.$("img[src*='volantinopiu']")) {
          await volantino.click();
          await page.reload();
          Logger.level(1).log("Phase 2️⃣ - Scraping");
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
    } catch (error) {
      Logger.error(error);
    }
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

      Logger.level(1).log("Phase 2️⃣ - Scraping");

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
      addToJSONFile(path.resolve(__dirname, "db.json"), prodotti);
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
        Logger.level(1).log("Phase 2️⃣ - Scraping");

        await scrape(page);
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
        Logger.level(1).log("Phase 2️⃣ - Scraping");
        await scrape(page);
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
        Logger.level(1).log("Phase 2️⃣ - Scraping");
        const newPrds = await scrapeVolantino(currPage);
        if (newPrds.length && newPrds.length > 0) {
          prds = [...prds, ...newPrds];
        } else {
          Logger.error("scraper.js:335 || newPrds is not an array.");
          Logger.error(newPrds);
        }
        await currPage.goto(
          "https://www.esselunga.it/it-it/promozioni/volantini.ben.html"
        );
        await this.acceptCookies(
          page,
          ".cookie-manager-container-wrapper .btn btn-blue-primary.accept-all-btn"
        );
        addToJSONFile(path.resolve(__dirname, "db.json"), prds);
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
      Logger.level(1).log("Phase 2️⃣ - Scraping");
      for (const cat of categories) {
        await page.goto(cat);

        await scrapeCategory(page);
      }
      await browser.close();
    } catch (error) {
      Logger.error(error);
    }
  }
  static async scrapeBasko() {
    let worker
    try {
      Logger.level(1).log("Phase 1️⃣ - Cleaning up cloudinary and local files");

      const baskoPath = path.resolve(__dirname, "..", "shops", "basko")
      await configCloudinary()

      await cloudinary.api.delete_resources_by_prefix("shopping");
      await cloudinary.api.delete_resources_by_prefix("flyers");
      Logger.level(1).log("Phase 2️⃣ - Upscaling and cropping");

      await upscaleAndCrop(3.5, baskoPath)

      let images = [];
      const folders = (await readdir(path.resolve(baskoPath, "parts")));
      Logger.level(1).log("Phase 3️⃣ - Uploading images");
      worker = await createWorker("ita_old");
      const data = []
      for (const folder of folders) {
        images = await uploadImages(folder, baskoPath)
        // console.log(images)

        for (const { secure_url: img } of images) {


          Logger.level(1).log("Performing OCR")
          // console.log(img)
          const ret = await worker.recognize(img);
          // const ret = await worker.recognize("https://res.cloudinary.com/dhbeeld3u/image/upload/v1710881864/shopping/nqu74kpqq2s7wmiuilf9.jpg");
          const prodName = ret.data.words.map((w) => w.text).join(" ");
          const final = {
            store: "basko",
            img,
            prodName,
          };
          data.push(final)
        }
        await addToJSONFile(path.resolve(__dirname, "db.json"), data)
      }
      await worker.terminate();
      await cleanup(baskoPath)

    } catch (error) {
      console.log(error)
      Logger.error(error)
      await worker.terminate()
    }
  }
  static async scrapeAll() {
    try {
      writeFileSync(path.resolve(__dirname, "db.json"), "[]");
      Logger.log("Scraping has started...");
      const startTime = new Date();
      Logger.log("Scraping Carrefour Express: ");
      await this.scrapeCarrefourExpress();
      Logger.log("Time elapsed: " + moment(startTime).fromNow(true));
      Logger.log("Scraping Carrefour Market: ");
      await this.scrapeCarrefourMarket();
      Logger.log("Time elapsed: " + moment(startTime).fromNow(true));
      Logger.log("Scraping COOP: ");
      await this.scrapeCoop();
      Logger.log("Time elapsed: " + moment(startTime).fromNow(true));
      Logger.log("Scraping Esselunga: ");
      await this.scrapeEsselunga();
      Logger.log("Time elapsed: " + moment(startTime).fromNow(true));
      Logger.log("Scraping Pam: ");
      await this.scrapePam();
      Logger.log("Time elapsed: " + moment(startTime).fromNow(true));
      Logger.log("Scraping Penny: ");
      await this.scrapePenny();
      Logger.log("Time elapsed: " + moment(startTime).fromNow(true));
      Logger.log("Scraping Lidl: ");
      await this.scrapeLidl();
      Logger.log("Time elapsed: " + moment(startTime).fromNow(true));
      Logger.log("Scraping Basko: ");
      await this.scrapeLidl();
      Logger.log("Scraping has ended.");
      Logger.log("Time elapsed: " + moment(startTime).fromNow(true));
      this.browser.close();
    } catch (error) {
      Logger.error(error);
    }
  }
}

