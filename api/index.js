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
    `Request: ${req.method.toUpperCase()} ${req.originalUrl} from ${
      req.socket.remoteAddress
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
    const { default: db } = await import("../shops/db.json", {
      assert: {
        type: "json",
      },
    })
    await Product.deleteMany({})
    const pages = Math.ceil(db.length / 100)
    for (let i = 0; i <= pages; i++) {
      const start = 100 * i
      const page = db.slice(start, start + 100)
      await Product.insertMany(page)
    }
    Logger.log("Saved in MongoDB")
    writeFileSync(
      path.resolve(import.meta.dirname, "..", "shops", "db.json"),
      "[]"
    )
  } catch (error) {
    Logger.error(error)
  }
  // mongoose.disconnect()
})

await connectToDB()

app.listen(3001, () => {
  Logger.log("📨Preparing to send emails...📨")
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  Logger.log("🌝 API is up! 🌚")
  console.table(listEndpoints(app))
})
