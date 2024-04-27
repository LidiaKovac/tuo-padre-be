import express from "express"
import cron from "node-cron"
import { Scraper } from "../shops/scraper.js"
import { Logger } from "../shops/logger.js"
import prodRoute from "./services/products/index.js"
import listEndpoints from "express-list-endpoints"
import { connectToDB } from "./configs/mongo.config.js"
import Product from "./schemas/product.schema.js"
import sgMail from "@sendgrid/mail"
import dotenv from "dotenv"
import cors from "cors"
import path from "path"
import { writeFileSync } from "fs"
import userRoute from "./services/user/index.js"
dotenv.config()
const app = express()

app.use(cors())
app.use("*", (req, res, next) => {
  Logger.log(
    `Request: ${req.method.toUpperCase()} ${req.originalUrl} from ${req.socket.remoteAddress
    }`
  )
  next()
})
app.use(express.json())
app.use("/products", prodRoute)
app.use("/user", userRoute)

Logger.log("Scheduling jobs...")
cron.schedule("00 8 * * *", async () => {
  // cron.schedule("54 11 * * WED", async () => {
  try {
    Logger.log("Running every day @ 8AM")
    await Scraper.scrapeAll()
    // await connectToDB()

    Logger.log("Saved in MongoDB")
  } catch (error) {
    Logger.error(error)
  }
  // mongoose.disconnect()
})

await connectToDB()

app.listen(3001, "192.168.1.251", () => {
  Logger.log("📨Preparing to send emails...📨")
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  Logger.log("🌝 API is up! 🌚")
  console.table(listEndpoints(app))
})
