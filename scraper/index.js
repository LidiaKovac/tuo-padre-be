import Product from "../api/schemas/product.schema.js"
import { Logger } from "../lib/logger.js"
import { scrapeCarrefourStores } from "./stores/carrefour/index.js"
import { scrapeCoop } from "./stores/coop/index.js"
import { scrapeEsselunga } from "./stores/esselunga/index.js"
import { scrapeIperCoop } from "./stores/ipercoop/index.js"
import { scrapePam } from "./stores/pam/index.js"
import { scrapePenny } from "./stores/penny/index.js"
import moment from "moment"

export const scrapeAll = async () => {
    try {
        await Product.deleteMany({})
        Logger.log("Scraping has started...")
        const startTime = new Date()
        Logger.log("Start time: " + moment(startTime).format("DD/MM/yyyy hh:mm"))
        // Logger.log("Scraping COOP: ")
        // await scrapeCoop()
        // Logger.log("Scraping IperCOOP: ")
        // await scrapeIperCoop()
        // Logger.log("Scraping Pam: ")
        // await scrapePam()
        // Logger.log("Scraping Penny: ")
        // await scrapePenny()
        // Logger.log("Scraping Carrefour: ")
        await scrapeCarrefourStores()
        // Logger.log("Scraping Esselunga: ")
        // await scrapeEsselunga()

        Logger.log("End time: " + moment(startTime).fromNow(true))

    } catch (error) {
        Logger.error(error)
    }
}

