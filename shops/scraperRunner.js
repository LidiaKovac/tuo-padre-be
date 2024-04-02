import { Logger } from "./logger.js"
import { Scraper } from "./scraper.js"
try {
  await Scraper.scrapeBasko()
} catch (error) {
  Logger.error(error)
}
