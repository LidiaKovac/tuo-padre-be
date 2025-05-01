import { readFileSync, writeFileSync } from "fs"
import { Logger } from "../lib/logger.js"
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


