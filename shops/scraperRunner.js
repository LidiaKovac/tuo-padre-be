import mongoose from "mongoose"
import { connectToDB } from "../api/configs/mongo.config.js"
import { Logger } from "./logger.js"
import { Scraper } from "./scraper.js"
try {
  await connectToDB()
  await Scraper.scrapeAll()
  await mongoose.disconnect()
} catch (error) {
  Logger.error(error)
}
