import Product from "../api/schemas/product.schema.js"
import { Logger } from "./logger.js"
import { Scraper } from "./scraper.js"
import { connectToDB } from "../api/configs/mongo.config.js"
try {
  await Scraper.scrapeAll()
} catch (error) {
  Logger.error(error)
}
