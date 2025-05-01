import mongoose from "mongoose"
import { connectToDB } from "../api/configs/mongo.config.js"
import { Logger } from "../lib/logger.js"
import { scrapeAll } from "./index.js"
try {
  await connectToDB()
  await scrapeAll()
  await mongoose.disconnect()
} catch (error) {
  Logger.error(error)
}
