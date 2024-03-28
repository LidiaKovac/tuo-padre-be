import { Logger } from "./logger.js"
import { Scraper } from "./scraper.js"
try {
  await Scraper.scrapeEsselunga()
} catch (error) {
  Logger.error(error)
}
