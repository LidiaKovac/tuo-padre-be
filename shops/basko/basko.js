// import { createWorker } from "tesseract.js";
import { createWorker } from "tesseract.js";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";
import { readFileSync, writeFileSync } from "fs";
import { readdir, unlink } from "fs/promises";
const { CLOUDINARY_URL } = process.env;

import "dotenv/config";
// this is important!
(async () => {
  const worker = await createWorker("ita_old");
  cloudinary.config({
    cloud_name: "dhbeeld3u",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log("Deleting files on cloudinary...");
  await cloudinary.api.delete_resources_by_prefix("shopping");

  const width = 265;
  const height = 320;
  for (let i = 0; i < 4; i++) {
    for (let y = 0; y < 3; y++) {
      const startW = 20 + width * i;
      const startH = 120 + height * y;
      await sharp("./shops/basko/3.png")
        .greyscale()
        .threshold()
        .normalise()
        .extract({
          left: startW,
          top: startH,
          width,
          height,
        })
        .toFile(`./shops/basko/parts/cut${i}-${y}.jpg`);
    }
  }
  const images = [];
  const files = await readdir("./shops/basko/parts/");
  console.log("Uploading files...");
  for (const file of files) {
    const r = await cloudinary.uploader.upload(`./shops/basko/parts/${file}`, {
      folder: "shopping",
    });
    images.push(r.secure_url);
    await unlink(`./shops/basko/parts/${file}`);
    console.log("✅ Uploaded!");
  }
  console.log("Local files cleaned up, writing on JSON file");
  for (const img of images) {
    const alreadyIn = JSON.parse(
      readFileSync("./shops/basko/basko.json", "utf-8")
    );

    const ret = await worker.recognize(img);
    const name = ret.data.words.map((w) => w.text).join(" ");
    const final = {
      store: "basko",
      img,
      name,
    };
    alreadyIn.push(final);
    writeFileSync("./shops/basko/basko.json", JSON.stringify(alreadyIn));
  }
  await worker.terminate();
})();
