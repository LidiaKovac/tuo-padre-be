import { readFileSync, writeFileSync } from "fs"
import { Logger } from "../shops/logger.js"
import { v2 as cloudinary } from "cloudinary"
import { readdir, unlink } from "fs/promises"
import path from "path"
import { connectToDB } from "../api/configs/mongo.config.js"
import Product from "../api/schemas/product.schema.js"
import mongoose from "mongoose"

export const configCloudinary = () =>
  cloudinary.config({
    cloud_name: "dhbeeld3u",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })

export const emptyFolder = async (folderName) => {
  const files = await readdir(folderName)
  for (const f of files) {
    await unlink(path.resolve(folderName, f))
  }
}

export function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
  })
}

export const scrollToBottom = async (page) => {
  let currHeight = 0
  let maxHeight = await page.evaluate("document.body.scrollHeight")
  while (currHeight < maxHeight) {
    // Scroll to the bottom of the page
    await page.evaluate(`window.scrollTo(0, ${currHeight})`)
    // Wait for page load
    await delay(200)

    currHeight += maxHeight / 100
    maxHeight = await page.evaluate("document.body.scrollHeight")
    // Calculate new scroll height and compare
  }
}

export const addToMongo = async (content) => {
  try {
    Logger.level(1).log("Phase 3️⃣ - Adding to MongoDB.")
    // await connectToDB()
    let prev = await Product.find()
    let counter = {
      added: 0,
      notAdded: 0,
    }
    if (content.length) {
      for (const c of content) {
        if (!c.price && c.store !== "basko") continue
        if (c.price) {
          c.price =
            parseFloat(
              c?.price
                ?.replaceAll("€", "")
                .replaceAll(" ", "")
                .replaceAll(",", ".")
                .trim() || 0
            ) || null
        }

        const found = prev.find(
          (p) => p.prodName === c.prodName && p.store === c.store
        )
        if (!found) {
          Logger.level(3).debug("Added product with name:" + c.prodName)
          counter.added++
          const newProd = new Product(c)
          await newProd.save()
          prev.push(c)
        } else {
          Logger.level(3).debug("Skipped product with name: " + c.prodName)
          counter.notAdded++
        }
      }
    } else {
      const prodNames = prev.map((el) => el.prodName)
      if (!prodNames.includes(content.prodName)) {
        counter.added++
        Logger.level(1).debug("Added product with name: " + content.prodName)
        Logger.debug("prezzo", content.price)
        content.price =
          parseFloat(
            content?.price
              ?.replaceAll("€", "")
              .replaceAll(" ", "")
              .replaceAll(",", ".")
              .trim() || 0
          ) || null
        const newProd = new Product(content)
        await newProd.save()
        prev.push(content)
      } else {
        counter.notAdded++
        Logger.level(1).debug(
          "Skipped product with name: " +
            content.prodName +
            " for reason: already present"
        )
      }
    }
    Logger.level(1).log(
      `Added ${counter.added} products, skipped ${counter.notAdded}. - Total products: ${prev.length}`
    )
    // await mongoose.disconnect()
  } catch (error) {
    Logger.level(1).error(error)
  }
}
