// import { createWorker } from "tesseract.js";
import { createWorker } from "tesseract.js";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";
import { readFileSync, writeFileSync } from "fs";
import { readdir, unlink } from "fs/promises";
const { CLOUDINARY_URL } = process.env;
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import "dotenv/config";
import { delay } from "../../utils/index.js";
import { Logger } from "../logger.js";

const getUpascalingResult = async (id) => {
  // const responseResult = await axios.request({
  //   url: `https://api.stability.ai/v2alpha/generation/stable-image/upscale/result/${id}`,
  //   method: "GET",
  //   validateStatus: undefined,
  //   responseType: "arraybuffer",
  //   headers: {
  //     accept: "image/*", // Use 'application/json' to receive base64 encoded JSON
  //     authorization: `Bearer ${process.env.STABILITY_KEY}`,
  //   },
  // });
  // if (responseResult.status === 202) {
  //   console.log("Generation is still running");
  //   await delay(10000);
  //   await getUpascalingResult(id);
  // } else if (responseResult.status === 200) {
  //   console.log("Generation is complete!");
  //   fs.writeFileSync(
  //     "./shops/basko/upscaled/3-big.png",
  //     Buffer.from(responseResult.data)
  //   );
  // } else {
  //   throw new Error(
  //     `Response ${responseResult.status}: ${responseResult.data.toString()}`
  //   );
  // }
};

const upscale = async () => {
  // const { url } = await cloudinary.uploader.upload(`./shops/basko/3.png`, {
  //   folder: "flyers",
  // });
  // const resized = cloudinary.image(`flyers/${url.split("/flyers/")[1]}`, {
  //   width: 1000,
  //   crop: "scale",
  // });
  // const resizedUrl = resized.split("src='")[1].split("' width=")[0];
  // const res = await fetch(resizedUrl);
  // const image = await res.arrayBuffer();
  // fs.writeFileSync("./shops/basko/flyers/3-resized.png", Buffer.from(image));

  // const formData = {
  //   image: fs.createReadStream("./shops/basko/flyers/3-resized.png"),
  //   prompt: "make clearer and sharper, optimize for OCR reading",
  //   output_format: "png",
  //   creativity: 0,
  // };

  // const response = await axios.postForm(
  //   `https://api.stability.ai/v2alpha/generation/stable-image/upscale`,
  //   axios.toFormData(formData, new FormData()),
  //   {
  //     validateStatus: undefined,
  //     headers: { Authorization: `Bearer ${process.env.STABILITY_KEY}` },
  //   }
  // );
  // // console.log(response);
  // // await delay(10000)
  // const generationID = response.data.id;
  // await getUpascalingResult(generationID);
  const formData = new FormData();
  // const file = fs.createReadStream("https://volantinoggi.it/File/43b0b8d0-a8f2-4609-a4ec-7ef36b7a87d3/3.png");
  const input = fs.readFileSync("./shops/basko/3.png");
  formData.append("image", input);
  formData.append("width", 1500);
  try {
    const response = await fetch(
      `https://api.stability.ai/v1/generation/esrgan-v1-x2plus/image-to-image/upscale`,
      {
        method: "POST",
        headers: {
          ...formData.getHeaders(),
          Accept: "image/png",
          Authorization: `Bearer ${process.env.STABILITY_KEY}`,
        },
        body: formData,
      }
    );
    console.log(response);
    if (!response.statusText !== "OK") {
      throw new Error(`Non-200 response: ${await response.text()}`);
    }
    const image = await response.arrayBuffer();
    fs.writeFileSync("./shops/basko/3-big.png", Buffer.from(image));
  } catch (error) {
    console.log(error);
  }
};

(async () => {
  try {
    const worker = await createWorker("ita_old");
    cloudinary.config({
      cloud_name: "dhbeeld3u",
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    console.log("Deleting files on cloudinary...");
    await cloudinary.api.delete_resources_by_prefix("shopping");
    await cloudinary.api.delete_resources_by_prefix("flyers");
    const { url } = await cloudinary.uploader.upload(`./shops/basko/3.png`, {
      folder: "flyers",
    });
    const WIDTH = 1102 * 3
    const resized = cloudinary.image(`flyers/${url.split("/flyers/")[1]}`, {
      width: WIDTH,
      crop: "scale",
    });
    const resizedUrl = resized.split("src='")[1].split("' width=")[0];
    const res = await fetch(resizedUrl);
    const image = await res.arrayBuffer();
    fs.writeFileSync("./shops/basko/upscaled/3-big.png", Buffer.from(image));

    // const formData = new FormData();
    // // const file = fs.createReadStream("https://volantinoggi.it/File/43b0b8d0-a8f2-4609-a4ec-7ef36b7a87d3/3.png");
    // const res = await axios.get("https://volantinoggi.it/File/43b0b8d0-a8f2-4609-a4ec-7ef36b7a87d3/3.png", {responseType: "arraybuffer"})
    // formData.append("image", res.data)
    // formData.append("width", 1500)

    // const response = await axios.post(
    //   `https://api.stability.ai/v1/generation/esrgan-v1-x2plus/image-to-image/upscale`,
    //   formData,
    //   {
    //     headers: {
    //       ...formData.getHeaders(),
    //       Accept: "image/png",
    //     },
    //   }
    // );
    // console.log(response);
    // if (!response.statusText !== "OK") {
    //   throw new Error(`Non-200 response: ${response.data}`);
    // }

    // const image = await response.arrayBuffer();
    // fs.writeFileSync("./shops/basko/3-big.png", Buffer.from(image));
    // await upscale();
    const width = Math.round(WIDTH / 4);
    const height = Math.round(WIDTH / 3);
    for (let i = 0; i < 4; i++) {
      for (let y = 0; y < 3; y++) {
        const startW = 60 + width * i;
        const startH = 360 + height * y;
        await sharp("./shops/basko/upscaled/3-big.png")
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
      const r = await cloudinary.uploader.upload(
        `./shops/basko/parts/${file}`,
        {
          folder: "shopping",
        }
      );
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
  } catch (error) {
    Logger.error(error);
  }
})();
