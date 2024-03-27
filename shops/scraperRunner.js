import { writeFileSync } from "fs"
import Product from "../api/schemas/product.schema.js"
import { Logger } from "./logger.js"
import { Scraper } from "./scraper.js"
import path from "path"
import { connectToDB } from "../api/configs/mongo.config.js"
try {
  await Scraper.scrapeAll()
  await connectToDB()
  const { default: db } = await import("./db.json", {
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
