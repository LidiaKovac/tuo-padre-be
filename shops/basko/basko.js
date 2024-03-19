import { createWorker } from "tesseract.js"
import sharp from "sharp"

import { v2 as cloudinary } from "cloudinary"
import { readdir, rmdir, unlink, writeFile } from "fs/promises"
import fs, { readFileSync, writeFileSync } from "fs"


import { configCloudinary, delay } from "../../utils/index.js"
import { Logger } from "../logger.js"
import puppeteer from "puppeteer"
import path from "path"
const __dirname = import.meta.dirname

import { cleanup, uploadImages, upscaleAndCrop } from "../../utils/basko.js"



const scrapeBasko = async () => {
  const worker = await createWorker("ita_old");

  try {
    await configCloudinary()
    // await upscaleAndCrop(3.5)

    Logger.log("Deleting files on cloudinary...");
    await cloudinary.api.delete_resources_by_prefix("shopping");
    await cloudinary.api.delete_resources_by_prefix("flyers");
    await upscaleAndCrop(3.5)

    const images = [];
    const folders = (await readdir(path.resolve(__dirname, "parts")));
    for (const folder of folders) {
      await uploadImages(folder)
      for (const img of images) {
        const alreadyIn = JSON.parse(
          readFileSync(path.resolve(__dirname, "basko.json"), "utf-8")
        );
        if (alreadyIn.map(el => el.img).includes(img)) {
          continue
        }
        const ret = await worker.recognize(img);
        const prodName = ret.data.words.map((w) => w.text).join(" ");
        const final = {
          store: "basko",
          img,
          prodName,
        };
        alreadyIn.push(final);
        writeFileSync(path.resolve(__dirname, "basko.json"), JSON.stringify(alreadyIn));
      }
    }
    await worker.terminate();
    await cleanup()

  } catch (error) {
    console.log(error)
    Logger.error(error)
    await worker.terminate()
  }
}

