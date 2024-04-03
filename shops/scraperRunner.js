import { Logger } from "./logger.js"
import { Scraper } from "./scraper.js"
try {
  await Scraper.scrapeAll()
} catch (error) {
  Logger.error(error)
}
