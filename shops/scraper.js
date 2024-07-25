import puppeteer from "puppeteer"
import { v2 as cloudinary } from "cloudinary"
import config from "../scraper.conf.js"
import {
  addToMongo,
  configCloudinary,
  delay,
  scrollToBottom,
} from "../utils/index.js"
import Product from "../api/schemas/product.schema.js"
import { scrape } from "../utils/carrefour.js"
import { Logger } from "./logger.js"
import moment from "moment"
import { scrapeVolantino } from "../utils/esselunga.js"
import { scrapeCategory } from "../utils/lidl.js"
import path from "path"
import { uploadImages, upscaleAndCrop } from "../utils/basko.js"
import { readdir } from "fs/promises"
import { createWorker } from "tesseract.js"
import { Cluster } from "puppeteer-cluster"
const __dirname = import.meta.dirname

/* 

  TODO: make basko easier, cleaner and lighter

  TODO: deploy as a background process
  TODO: add autopush 

  TODO: move basko to suggestions
  TODO: penny images
*/

const CLUSTER_OPTIONS = {
  concurrency: Cluster.CONCURRENCY_PAGE,
  maxConcurrency: 2,
  monitor: true,
  puppeteerOptions: config.puppeteer,
  retryLimit: 3, // Retry failed tasks up to 3 times
  timeout: 5 * 60 * 1000,
}

export class Scraper {
  browser
  cluster
  subCluster

  constructor() {
    process.on("SIGINT", this.shutdown)
    process.on("SIGTERM", this.shutdown)
  }
  shutdown = async () => {
    await this.cluster.close()
    process.exit(0)
  }

  async abortReqs(page) {
    await page.setRequestInterception(true)
    page.on("request", async (req) => {
      if (
        // req.resourceType() == "stylesheet" ||
        req.resourceType() == "font" ||
        req.resourceType() == "image"
      ) {
        await req.abort()
      } else {
        await req.continue()
      }
    })
  }

  async launchBrowser() {
    this.cluster = await Cluster.launch(CLUSTER_OPTIONS)
  }
  async acceptCookies(page, selector) {
    try {
      const hasCookie = await page.$(selector)
      if (hasCookie) {
        const cookie = await page.waitForSelector(selector)
        await cookie.click()
        Logger.debug("Cookies acceptes")
      }
    } catch (error) {
      Logger.error("   Error accepting cookies: " + error)
    }
  }
  //   Common to more shops
  async scrapeVolantinoPiu({ page, shopName }) {
    try {
      await delay(500)
      // Wait and click on first result
      await this.acceptCookies(page, config.selectors.cookies.cybot)
      // await delay(3000)
      const close = await page.$(".modal .btn-close")
      if (close) {
        await close.click()
      }
      await delay(500)
      // await page.waitForSelector("li.esplodi")
      const button = await page.$("li.esplodi")
      await delay(500)
      await button.click()
      await page.waitForSelector(".card")
      const cards = await page.$$(".card")
      const scadenza = await page.$eval(
        ".barra_laterale .fw-semibold",
        ({ innerText }) => innerText.split(" al ")[1].trim()
      )
      const prodotti = []
      for (const card of cards) {
        let img = null
        let price = null
        let prodName = null
        let prodQuantity = null
        let needsCard = false
        img = await card.$eval("img", ({ src }) => src)

        const priceEl = await card.$(".product-price")
        if (priceEl) {
          price = await card.$eval(".product-price", (el) => el.innerText)
        }
        prodName = await card.$eval(".card-title", ({ innerText }) => innerText)
        prodQuantity = await card.$eval(
          ".card-text",
          ({ innerText }) => innerText
        )
        if (await card.$(".meccanica img")) {
          if (shopName === "pam") {
            needsCard = await card.$eval(".meccanica img", ({ src }) =>
              src.includes("per_te")
            )
          }
          if (shopName === "coop") {
            needsCard = await card.$eval(".meccanica img", ({ src }) =>
              src.includes("soci")
            )
          }
        } else needsCard = false
        prodotti.push({
          img,
          price,
          prodName,
          prodQuantity,
          store: shopName,
          needsCard,
          scadenza,
        })
      }

      await addToMongo(prodotti)
    } catch (error) {
      Logger.error(error)
    }
  }
  //   !Shops
  scrapeCoop = async ({ page, data }) => {
    try {
      await page.setRequestInterception(true)
      const context = page.browser().defaultBrowserContext()
      await context.overridePermissions(baseUrl, ["geolocation"])
      // Launch the browser and open a new blank page
      await this.abortReqs(page)
      await page.goto(data)
      await this.acceptCookies(page, config.selectors.cookies.cybot)
      await page.type("#pac-input", "genova")

      await page.waitForSelector("button#submit")
      const sub = await page.$("button#submit")
      await sub.scrollIntoView()
      await sub.click()
      const shop = await page.waitForSelector(".list-menu .item")
      await shop.click()
      // Type into search box
      Logger.level(1).log("Phase 2️⃣ - Scraping")
      await this.scrapeVolantinoPiu({
        page,
        shopName: "coop",
      })
    } catch (error) {
      Logger.error(error)
    }
  }
  scrapeIperCoop = async ({ page, data }) => {
    try {
      await this.abortReqs(page)
      const context = page.browser().defaultBrowserContext()
      await context.overridePermissions(data + "/", ["geolocation"])
      await page.setGeolocation({ latitude: 44.414165, longitude: 8.942184 })
      await page.goto(data)
      await delay(500)
      await this.acceptCookies(page, config.selectors.cookies.cybot)
      if (await page.$(".swal2-input")) {
        await page.type(".swal2-input", "genova")
        await page.keyboard.press("Enter")

        const shop = await page.waitForSelector(
          ".list-menu .item:has(img[src*='Ipercoop'])"
        )
        await shop.click()
      }
      // Type into search box
      const flyers = await page.$$(".swiper-slide")
      const volantinoTask = async ({ page, data: href }) => {
        await page.setRequestInterception(true)
        page.on("request", async (req) => {
          if (
            req.resourceType() == "stylesheet" ||
            req.resourceType() == "font" ||
            req.resourceType() == "image"
          ) {
            await req.abort()
          } else {
            await req.continue()
          }
        })
        await page.goto(href)

        await this.scrapeVolantinoPiu({
          page: page,
          shopName: "ipercoop",
        })
      }
      this.subCluster = await Cluster.launch(CLUSTER_OPTIONS)
      for (const flyer of flyers) {
        const href = await flyer.$eval("a", ({ href }) => href)
        await this.subCluster.queue(href, volantinoTask)
      }
      await this.subCluster.idle()
      await this.subCluster.close()
    } catch (error) {
      console.log(error)
    }
  }
  scrapePam = async ({ page, data: url }) => {
    try {
      await this.abortReqs(page)

      await page.goto(url)
      await this.acceptCookies(page, "#cookiePopupSave")
      await page.waitForSelector(".storeFlyer img[src*='volantinopiu']")
      let counter = await page.$$eval(
        ".storeFlyer img[src*='volantinopiu']",
        ({ length }) => length
      )

      for (let i = 1; i <= counter; i++) {
        const volantino = await page.$(`.storeFlyer:nth-of-type(${i})`)
        if (volantino && volantino.$("img[src*='volantinopiu']")) {
          await volantino.click()
          await delay(1000)
          await page.waitForSelector(".esplodi")
          await this.scrapeVolantinoPiu({
            page,
            shopName: "pam",
          })
          await page.goBack()
        }
      }

    } catch (error) {
      Logger.error(error)
    }
  }
  async scrapePenny() {
    try {
      // Launch the browser and open a new blank page
      const { page, browser } = await this.launchBrowser(
        "https://www.penny.it/",
        "offerte"
      )

      await this.acceptCookies(page, config.selectors.cookies.onetrust)
      await delay(3000)
      await page.waitForSelector(".ws-product-grid__list li.ws-card")
      const cards = await page.$$(".ws-product-grid__list li.ws-card")

      Logger.level(1).log("Phase 2️⃣ - Scraping")

      const prodotti = []
      for (const card of cards) {
        let img = null
        let price = null
        let prodName = null
        let prodQuantity = null
        let needsCard = false
        let scadenza = null
        img = await card.$eval("img", ({ src }) => src)
        await card.waitForSelector(".ws-product-tile__info")
        const infoArea = await card.$(".ws-product-tile__info")
        const priceEl = await infoArea.$(".ws-product-price-type__value")
        if (priceEl) {
          price = await infoArea.$eval(
            ".ws-product-price-type__value",
            (el) => el.innerText
          )
        }
        prodName = await infoArea.$eval("h3 span", ({ innerText }) => innerText)
        prodQuantity = await infoArea.$eval(
          ".ws-product-information ul li",
          ({ innerText }) => innerText
        )
        needsCard = (await card.$(
          ".ws-product-tile-container__discount-info img"
        ))
          ? true
          : false
        scadenza = await infoArea.$eval(
          ".ws-product-price-validity span:last-of-type",
          ({ innerText }) => innerText.slice(-10)
        )
        prodotti.push({
          img,
          price,
          prodName,
          prodQuantity,
          store: "penny",
          needsCard,
          scadenza,
        })
      }

      await delay(5000)

      await addToMongo(prodotti)
      await browser.close()
    } catch (error) {
      Logger.error(error)
    }
  }
  // async scrapeCarrefourExpress() {
  //   try {
  //     const { page, browser } = await this.launchBrowser(
  //       "https://www.carrefour.it/",
  //       "/volantino/supermercato-carrefour-express-genova-via-bologna-94-94-a-r/2467"
  //     )

  //     await this.acceptCookies(page, config.selectors.cookies.onetrust)

  //     await delay(3000)
  //     await scrollToBottom(page)
  //     // Seleziona tutti i volantini in cima alla pagina
  //     const volantini = await page.$$(".card.card--carousel:not(.promoclick)")
  //     for (let i = 1; i <= volantini.length; i++) {
  //       const volantino = await volantini[i - 1].$eval(
  //         `a.trackingEventsLink`,
  //         ({ href }) => href
  //       )
  //       if (!volantino) continue
  //       // await volantino.scrollIntoView()
  //       // await volantino.click()
  //       // await delay(3000)
  //       const curr = await browser.newPage()
  //       await curr.goto(volantino)
  //       Logger.level(1).log("Phase 2️⃣ - Scraping")
  //       await scrape(curr, "carrefour-express")
  //     }
  //     await browser.close()
  //   } catch (error) {
  //     Logger.error(error)
  //   }
  // }
  // async scrapeCarrefourMarket() {
  //   try {
  //     const { page, browser } = await this.launchBrowser(
  //       "https://www.carrefour.it/",
  //       "volantino/supermercato-carrefour-market-genova-via-cesarea-12r-14r-16r/4390"
  //     )

  //     await this.acceptCookies(page, config.selectors.cookies.onetrust)

  //     await delay(3000)

  //     const volantini = await page.$$(".card.card--carousel:not(.promoclick)")
  //     for (let i = 1; i <= volantini.length; i++) {
  //       const volantino = await volantini[i - 1].$eval(
  //         `a.trackingEventsLink`,
  //         ({ href }) => href
  //       )
  //       if (!volantino) continue
  //       // await volantino.scrollIntoView()
  //       // await volantino.click()
  //       // await delay(3000)
  //       const curr = await browser.newPage()
  //       await curr.goto(volantino)
  //       Logger.level(1).log("Phase 2️⃣ - Scraping")
  //       await scrape(curr, "carrefour-market")
  //     }
  //     await browser.close()
  //   } catch (error) {
  //     Logger.error(error)
  //   }
  // }
  // async scrapeEsselunga() {
  //   try {
  //     const { page, browser } = await this.launchBrowser(
  //       "https://www.esselunga.it/",
  //       "it-it/promozioni/volantini.ben.html"
  //     )
  //     await this.acceptCookies(
  //       page,
  //       ".cookie-manager-container-wrapper .btn.btn-blue-primary.accept-all-btn"
  //     )

  //     await delay(1000)
  //     // Seleziona tutti i volantini e li apre uno per uno
  //     const flyers = await page.$$(".single-flyer")
  //     for (let i = 0; i < flyers.length; i++) {
  //       const flyer = await page.$(`.single-flyer:nth-of-type(${i + 1})`)
  //       if (!flyer) continue
  //       const btn = await flyer.$eval(
  //         ".btn-blue-primary.flyer-btn",
  //         ({ href }) => href
  //       )
  //       const currPage = await browser.newPage()

  //       await currPage.goto(btn)
  //       await delay(2000)
  //       await this.acceptCookies(
  //         page,
  //         ".cookie-manager-container-wrapper .btn btn-blue-primary.accept-all-btn"
  //       )
  //       Logger.level(1).log("Phase 2️⃣ - Scraping")
  //       await scrapeVolantino(currPage)
  //     }

  //     await browser.close()
  //   } catch (error) {
  //     Logger.error(error)
  //   }
  // }
  // async scrapeLidl() {
  //   try {
  //     // Launch the browser and open a new blank page
  //     const { page, browser } = await this.launchBrowser(
  //       "https://www.lidl.it",
  //       "/"
  //     )

  //     await this.acceptCookies(page, config.selectors.cookies.onetrust)

  //     const linkToSales = await page.waitForSelector(
  //       ".n-header__main-navigation-link--sale"
  //     )
  //     await linkToSales.click()
  //     await delay(3000)
  //     const bigCard = await page.waitForSelector(".AHeroStageItems__Item")

  //     await bigCard.click()
  //     await page.waitForSelector(".ATheHeroStage__Offer")
  //     const categories = await page.$$eval(
  //       "div[role='row']:first-of-type .ATheHeroStage__Offer .ATheHeroStage__OfferAnchor",
  //       (aTags) => aTags.map((a) => a.href)
  //     )
  //     Logger.level(1).log("Phase 2️⃣ - Scraping")
  //     for (const cat of categories) {
  //       await page.goto(cat)

  //       await scrapeCategory(page)
  //     }
  //     await browser.close()
  //   } catch (error) {
  //     Logger.error(error)
  //   }
  // }
  // async scrapeBasko() {
  //   let worker = await createWorker("ita_old")
  //   try {
  //     Logger.level(1).log("Phase 1️⃣ - Cleaning up cloudinary and local files")

  //     const baskoPath = path.resolve(__dirname, "..", "shops", "basko")
  //     await configCloudinary()

  //     await cloudinary.api.delete_resources_by_prefix("shopping")
  //     await cloudinary.api.delete_resources_by_prefix("flyers")
  //     Logger.level(1).log("Phase 2️⃣ - Upscaling and cropping")

  //     await upscaleAndCrop(3.5, baskoPath)

  //     let images = []
  //     const folders = await readdir(path.resolve(baskoPath, "parts"))
  //     Logger.level(1).log("Phase 3️⃣ - Uploading images")

  //     const data = []
  //     for (const folder of folders) {
  //       images = await uploadImages(folder, baskoPath)
  //       Logger.level(2).log("Performing OCR")
  //       for (const { secure_url: img } of images) {
  //         const ret = await worker.recognize(img)
  //         const prodName = ret.data.words.map((w) => w.text).join(" ")
  //         const final = {
  //           store: "basko",
  //           img,
  //           prodName: prodName.replaceAll(/[^A-Z0-9\s]+/gi, ""),
  //         }
  //         data.push(final)
  //       }
  //     }
  //     await addToMongo(data)
  //     await worker.terminate()
  //     // await cleanup(baskoPath)
  //   } catch (error) {
  //     console.log(error)
  //     Logger.error(error)
  //     await worker.terminate()
  //   }
  // }
  async scrapeAll() {
    try {
      // await Product.deleteMany({})
      await this.launchBrowser()
      const SHOP_MAP = new Map()
      // SHOP_MAP.set("https://volantinocoop.it/cerca", this.scrapeCoop)
      SHOP_MAP.set("https://coopliguria.promoipercoop.it", this.scrapeIperCoop)
      SHOP_MAP.set(
        "https://www.pampanorama.it/punti-vendita/genova-lagaccio",
        this.scrapePam
      )

      SHOP_MAP.forEach(async (fn, url) => {
        await this.cluster.queue(url, fn)
      })
      await this.cluster.idle()
      await this.subCluster.idle()
      await this.cluster.close()
      await this.subCluster.close()
      // SHOP_MAP.set("https://volantinocoop.it/cerca", this.scrapeCoop)
      // SHOP_MAP.set("https://volantinocoop.it/cerca", this.scrapeCoop)
    } catch (error) {
      Logger.error(error)
      this.cluster.close()
    } finally {
      this.cluster.close()
    }
  }
}
