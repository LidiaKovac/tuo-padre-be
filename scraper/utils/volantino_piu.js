import { delay } from "../scraper.utils";
import { Logger } from "../lib/logger.js"
import config from "./scraper.config.json" with {type: "json"}


export const scrapeVolatinoPiu = async ({ page, shopName }) => {
    try {
        await delay(1500)
        //!using a delay so that the page can fully render. 
        //!rendering of SPAs seems a little bit weird, we might want to
        //!condisder switchning to another library in the future
        const modal = await page.$(".modal.show")
        if (modal) {
            await modal.evaluate(e => e.style.display = "none");
            const backdrop = await page.$(".modal-backdrop.fade.show");
            if (backdrop) {
                await backdrop.evaluate(el => el.remove());
            }
        } else Logger.log("Didn't find a modal. Proceeding.")

        const selectors = config.volantinoPiu;
        await delay(1000)
        const button = await page.$(selectors.button)
        if (!button) {
            //button is disabled
            Logger.warning("🔨 Skipping flyer - li.esplodi doesn't exist");
            return
        } else {
            await button.click({ delay: 2000 })
            await button.click()
        }

        await page.waitForSelector(selectors.card)
        const cards = await page.$$(selectors.card)
        const scadenza = await page.$eval(selectors.scadenza, el =>
            el.innerText.split(" al ")[1].trim()
        );

        const prodotti = [];
        for (const card of cards) {
            const img = await card.$eval(selectors.img, el => el.src);

            let price = null;
            const priceEl = await card.$(selectors.price);
            if (priceEl) {
                price = await card.$eval(selectors.price, el => el.innerText);
            }

            const prodName = await card.$eval(`${selectors.card}${selectors.name}`, el => el.innerText);
            const prodQuantity = await card.$eval(`${selectors.card}${selectors.name}`, el => el.innerText);

            let needsCard = false;
            const cardImg = await card.$(selectors.needsCard);
            if (cardImg) {
                const src = await cardImg.evaluate(el => el.src);
                if (shopName === "pam") {
                    needsCard = src.includes("per_te");
                } else if (shopName === "coop") {
                    needsCard = src.includes("soci");
                }
            }

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

        await addToMongo(prodotti);
    } catch (error) {
        Logger.error("❌ scrapeVolatinoPiu failed: " + error.message);
    }
};