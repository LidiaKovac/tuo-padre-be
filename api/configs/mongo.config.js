import mongoose from "mongoose"
import { Logger } from "../../shops/logger.js"
import "dotenv/config"
export const connectToDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI)
  Logger.log("🌚 Connected to DB! 🌝")
  return conn
}
