import Product from "../api/schemas/product.schema.js"
import { Logger } from "./logger.js"
import { Scraper } from "./scraper.js"
import { connectToDB } from "../api/configs/mongo.config.js"
try {
  // await connectToDB()

  // await Product.deleteMany({})

  await Scraper.scrapeBasko()
} catch (error) {
  Logger.error(error)
}
