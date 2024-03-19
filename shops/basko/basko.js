import { createWorker } from "tesseract.js"
import sharp from "sharp"

import { v2 as cloudinary } from "cloudinary"
import { readdir, rmdir, unlink, writeFile } from "fs/promises"
const { CLOUDINARY_URL } = process.env
import fs, { readFileSync, writeFileSync } from "fs"

import "dotenv/config"
import { delay } from "../../utils/index.js"
import { Logger } from "../logger.js"
import puppeteer from "puppeteer"
import path from "path"
const __dirname = import.meta.dirname

import sizeOf from "image-size"

const configCloudinary = () =>
  cloudinary.config({
    cloud_name: "dhbeeld3u",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })

const emptyFolder = async (folderName) => {
  const files = await readdir(folderName)
  for (const f of files) {
    await unlink(path.resolve(folderName, f))
  }
}


const cleanup = async () => {
  const ff = await readdir(path.resolve(__dirname, "flyers"))
  const pf = await readdir(path.resolve(__dirname, "parts"))
  const uf = await readdir(path.resolve(__dirname, "upscaled"))
  for (const f of ff) {
    await emptyFolder(path.resolve(__dirname, "flyers", f))
    await rmdir(path.resolve(__dirname, "flyers", f))
  }
  for (const f of pf) {
    await emptyFolder(path.resolve(__dirname, "parts", f))
    await rmdir(path.resolve(__dirname, "parts", f))
  }
  for (const f of uf) {
    await emptyFolder(path.resolve(__dirname, "upscaled", f))
    await rmdir(path.resolve(__dirname, "upscaled", f))
  }
}

const fetchImages = async () => {
  Logger.log("Cleaning up...")
  await cleanup()
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  // Navigate the page to a URL
  await page.goto("https://www.basko.it/volantino-offerte")
  await page.setGeolocation({ latitude: 44.414165, longitude: 8.942184 })

  const cookie = await page.waitForSelector(
    "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll"
  )
  if (cookie) {
    cookie.click()
    Logger.log("Cookie accettati")
  }
  await delay(3000)
  const links = await page.$$eval(".swiper-slide a[href]", (els) =>
    els.map((el) => el.href)
  )
  let flyerNum = 1
  for (const link of links) {
    Logger.log(`Flyer # ${flyerNum}:`)
    if (!fs.existsSync(path.resolve(__dirname, "flyers", `flyer-${flyerNum}`)))
      fs.mkdirSync(path.resolve(__dirname, "flyers", `flyer-${flyerNum}`))
    await page.goto(link)
    await delay(2000)
    const iframeUrl = await page.$eval("iframe", (iframe) => iframe.src)
    const flyerPage = await browser.newPage()
    await flyerPage.goto(iframeUrl)
    await flyerPage.setGeolocation({ latitude: 44.414165, longitude: 8.942184 })
    await delay(4000)
    const imageUrls = await flyerPage.$$eval(".p-carousel-item img", (items) =>
      items.map((i) => i.src)
    )
    for (const image of imageUrls) {
      const res = await fetch(image)
      const downloaded = await res.arrayBuffer()
      Logger.log("Downloading pages")

      fs.writeFileSync(
        path.resolve(__dirname, "flyers", `flyer-${flyerNum}`) +
        "/" +
        image.slice(-5),
        Buffer.from(downloaded)
      )
    }
    flyerNum++
    // return imageUrls
  }
  browser.close()

}

const crop = async (
  rows,
  cols,
  offsetW,
  offsetY,
  prefix,
  fileName,
  width,
  height,
  page
) => {
  Logger.log("Creating image parts:")
  Logger.log(`Creating `)
  if (!fs.existsSync(path.resolve(__dirname, "parts", `flyer-${prefix}`)))
    fs.mkdirSync(path.resolve(__dirname, "parts", `flyer-${prefix}`))

  for (let i = 0; i < cols; i++) {
    for (let y = 0; y < rows; y++) {
      const startW = offsetW + (width * i)
      const startH = offsetY + (height * y)
      await sharp(
        path.resolve(
          __dirname,
          "upscaled",
          `flyer-${prefix}`,
          `big-${prefix}-${fileName}`
        )
      )
        .extract({
          left: startW,
          top: startH,
          width,
          height,
        })
        .toFile(
          path.resolve(
            __dirname,
            "parts",
            `flyer-${prefix}`,
            `cut-${fileName}-${y}-${i}-color.jpg`
          )
        )
      await sharp(
        path.resolve(
          __dirname,
          "upscaled",
          `flyer-${prefix}`,
          `big-${prefix}-${fileName}`
        )
      )
        .greyscale()
        .threshold()
        .normalise()
        .sharpen()
        .extract({
          left: startW,
          top: startH,
          width,
          height,
        })
        .toFile(
          path.resolve(
            __dirname,
            "parts",
            `flyer-${prefix}`,
            `cut-${fileName}-${y}-${i}-bw.jpg`
          )
        )
    }
  }
}

const upscaleAndCrop = async (amount) => {
  await fetchImages()
  Logger.log("Uploading and upscaling: ")
  const folders = await readdir(path.resolve(__dirname, "flyers"))
  for (let y = 1; y <= folders.length; y++) {
    const folder = folders[y - 1]

    const images = await readdir(path.resolve(__dirname, "flyers", folder))
    let skipped = 0
    if (images.length <= 1) {
      console.log("Skipping")
      skipped++
      continue
    }
    if (!fs.existsSync(path.resolve(__dirname, "upscaled", `flyer-${y}`)))
      fs.mkdirSync(path.resolve(__dirname, "upscaled", `flyer-${y}`))

    for (let i = 1; i <= images.length; i++) {
      const image = images[i - 1]

      const { url } = await cloudinary.uploader.upload(
        path.resolve(__dirname, "flyers", folder, image),
        {
          folder: "flyers",
        }
      )
      let ogWidth, ogHeight
      const dimensions = sizeOf(
        path.resolve(__dirname, "flyers", folder, image)
      )
      ogWidth = dimensions.width
      ogHeight = dimensions.height

      const WIDTH = Math.floor(ogWidth * amount)
      Logger.log(
        "Upscaling (I ain't got those AI money so I'm just making the image 3.5x bigger xd"
      )
      const resized = cloudinary.image(`flyers/${url.split("/flyers/")[1]}`, {
        width: WIDTH,
        crop: "scale",
      })
      const resizedUrl = resized.split("src='")[1].split("' width=")[0]
      let fileName = resizedUrl.split("flyers/")[1].split("?_")[0]
      const res = await fetch(resizedUrl)
      const resizedImage = await res.arrayBuffer()
      Logger.log("Writing on disk")
      fs.writeFileSync(
        path.resolve(
          __dirname,
          "upscaled",
          `flyer-${y}`,
          `big-${y}-${fileName}`
        ),
        Buffer.from(resizedImage)
      )
      const { height: h } = sizeOf(
        path.resolve(__dirname, "flyers", folder, image)
      )
      const HEIGHT = h * amount
      if (ogHeight == ogWidth || ogWidth / ogHeight > 1) {
        const offset = Math.floor(20 * amount)
        const offsetY = Math.floor(70 * amount)

        const width = Math.floor((WIDTH - (offset * 2)) / 4)
        const height = Math.floor((HEIGHT - offsetY) / 3)
        Logger.log("Square flyer detected")
        crop(3, 4, offset, offsetY, y, fileName, width, height, i)
      } else {

        const offset = Math.round(20 * amount)
        const width = Math.floor((WIDTH - (offset * 2)) / 2)
        const height = Math.floor((HEIGHT - (offset * 2)) / 3)

        crop(3, 2, offset, offset, y, fileName, width, height, i)
      }

      Logger.log("Done")
    }
  }
  return
}

// (async () => {

// })();

const uploadImages = async (folder) => {
  const files = await readdir(path.resolve(__dirname, "parts", folder))

  Logger.log("Uploading files...");
  const uploadPromises = files.map(file => {
    if (file.includes("color")) {
      return cloudinary.uploader.upload(
        path.resolve(__dirname, "parts", folder, file),
        {
          folder: "shopping",
        }
      );
    }
  })
  const images = await Promise.all(uploadPromises)
  // for (const file of files) {
  //   if (!file.includes("color")) continue

  //   const r = await cloudinary.uploader.upload(
  //     path.resolve(__dirname, "parts", folder, file),
  //     {
  //       folder: "shopping",
  //     }
  //   );
  //   // await unlink(`./shops/basko/parts/${file}`);

  //   images.push(r.secure_url);
  // }
  Logger.log("✅ Uploaded!");
}

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
      uploadImages(folder)
      Logger.log("Writing on JSON file");
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

await scrapeBasko()
