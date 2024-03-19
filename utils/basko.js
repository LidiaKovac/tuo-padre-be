
const { CLOUDINARY_URL } = process.env
import { v2 as cloudinary } from "cloudinary"
import sizeOf from "image-size"

import "dotenv/config"
const __dirname = import.meta.dirname
import path from "path"
import fs from "fs"
import sharp from "sharp"
import puppeteer from "puppeteer"
import { readdir, rmdir } from "fs/promises"
import { delay, emptyFolder } from "./index.js"
import { Logger } from "../shops/logger.js"

export const cleanup = async (chosenPath) => {
    const ff = await readdir(path.resolve(chosenPath, "flyers"))
    const pf = await readdir(path.resolve(chosenPath, "parts"))
    const uf = await readdir(path.resolve(chosenPath, "upscaled"))
    for (const f of ff) {
        await emptyFolder(path.resolve(chosenPath, "flyers", f))
        await rmdir(path.resolve(chosenPath, "flyers", f))
    }
    for (const f of pf) {
        await emptyFolder(path.resolve(chosenPath, "parts", f))
        await rmdir(path.resolve(chosenPath, "parts", f))
    }
    for (const f of uf) {
        await emptyFolder(path.resolve(chosenPath, "upscaled", f))
        await rmdir(path.resolve(chosenPath, "upscaled", f))
    }
}

export const fetchImages = async (chosenPath) => {
    await cleanup(chosenPath)
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
    }
    await delay(3000)
    const links = await page.$$eval(".swiper-slide a[href]", (els) =>
        els.map((el) => el.href)
    )
    let flyerNum = 1
    for (const link of links) {
        if (!fs.existsSync(path.resolve(chosenPath, "flyers", `flyer-${flyerNum}`)))
            fs.mkdirSync(path.resolve(chosenPath, "flyers", `flyer-${flyerNum}`))
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

            fs.writeFileSync(
                path.resolve(chosenPath, "flyers", `flyer-${flyerNum}`) +
                "/" +
                image.slice(-5),
                Buffer.from(downloaded)
            )
        }
        flyerNum++
    }
    browser.close()

}

export const crop = async (
    rows,
    cols,
    offsetW,
    offsetY,
    prefix,
    fileName,
    width,
    height,
    chosenPath
) => {
    if (!fs.existsSync(path.resolve(chosenPath, "parts", `flyer-${prefix}`)))
        fs.mkdirSync(path.resolve(chosenPath, "parts", `flyer-${prefix}`))

    for (let i = 0; i < cols; i++) {
        for (let y = 0; y < rows; y++) {
            const startW = offsetW + (width * i)
            const startH = offsetY + (height * y)
            await sharp(
                path.resolve(
                    chosenPath,
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
                        chosenPath,
                        "parts",
                        `flyer-${prefix}`,
                        `cut-${fileName}-${y}-${i}-color.jpg`
                    )
                )
            await sharp(
                path.resolve(
                    chosenPath,
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
                        chosenPath,
                        "parts",
                        `flyer-${prefix}`,
                        `cut-${fileName}-${y}-${i}-bw.jpg`
                    )
                )
        }
    }
}

export const upscaleAndCrop = async (amount, baskoPath) => {
    Logger.level(2).log("Phase 🔴 - Fetching images");

    await fetchImages(baskoPath)
    const folders = await readdir(path.resolve(baskoPath, "flyers"))
    for (let y = 1; y <= folders.length; y++) {
        const folder = folders[y - 1]

        const images = await readdir(path.resolve(baskoPath, "flyers", folder))
        let skipped = 0
        if (images.length <= 1) {
            skipped++
            continue
        }
        if (!fs.existsSync(path.resolve(baskoPath, "upscaled", `flyer-${y}`)))
            fs.mkdirSync(path.resolve(baskoPath, "upscaled", `flyer-${y}`))
        Logger.level(2).log("Phase 🟡 - Upscaling");

        for (let i = 1; i <= images.length; i++) {
            const image = images[i - 1]

            const { url } = await cloudinary.uploader.upload(
                path.resolve(baskoPath, "flyers", folder, image),
                {
                    folder: "flyers",
                }
            )
            let ogWidth, ogHeight
            const dimensions = sizeOf(
                path.resolve(baskoPath, "flyers", folder, image)
            )
            ogWidth = dimensions.width
            ogHeight = dimensions.height

            const WIDTH = Math.floor(ogWidth * amount)

            const resized = cloudinary.image(`flyers/${url.split("/flyers/")[1]}`, {
                width: WIDTH,
                crop: "scale",
            })
            const resizedUrl = resized.split("src='")[1].split("' width=")[0]
            let fileName = resizedUrl.split("flyers/")[1].split("?_")[0]
            const res = await fetch(resizedUrl)
            const resizedImage = await res.arrayBuffer()
            fs.writeFileSync(
                path.resolve(
                    baskoPath,
                    "upscaled",
                    `flyer-${y}`,
                    `big-${y}-${fileName}`
                ),
                Buffer.from(resizedImage)
            )
            const { height: h } = sizeOf(
                path.resolve(baskoPath, "flyers", folder, image)
            )
            Logger.level(2).log("Phase 🟢 - Cropping");

            const HEIGHT = h * amount
            if (ogHeight == ogWidth || ogWidth / ogHeight > 1) {
                const offset = Math.floor(20 * amount)
                const offsetY = Math.floor(70 * amount)

                const width = Math.floor((WIDTH - (offset * 2)) / 4)
                const height = Math.floor((HEIGHT - offsetY) / 3)
                crop(3, 4, offset, offsetY, y, fileName, width, height, path.resolve(__dirname, "..", "shops", "basko"))
            } else {

                const offset = Math.round(20 * amount)
                const width = Math.floor((WIDTH - (offset * 2)) / 2)
                const height = Math.floor((HEIGHT - (offset * 2)) / 3)

                crop(3, 2, offset, offset, y, fileName, width, height, path.resolve(__dirname, "..", "shops", "basko"))
            }

        }
    }
    return
}


export const uploadImages = async (folder, chosenPath) => {
    const files = await readdir(path.resolve(chosenPath, "parts", folder))

    Logger.level(2).log("Uploading files...");
    const uploadPromises = files.map(file => {
        if (file.includes("color")) {
            return cloudinary.uploader.upload(
                path.resolve(chosenPath, "parts", folder, file),
                {
                    folder: "shopping",
                }
            );
        }
    })
    await Promise.all(uploadPromises)
    Logger.level(2).log("✅ Uploaded!");
}