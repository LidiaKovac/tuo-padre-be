// import { createWorker } from "tesseract.js";
import { createWorker } from "tesseract.js";
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
// this is important!
(async () => {
  const worker = await createWorker("ita_old");
  const width = 265;
  const height = 320;
  for (let i = 0; i < 4; i++) {
    for (let y = 0; y < 3; y++) {
      const startW = 20 + width * i;
      const startH = 120 + height * y;
      console.log(startW, startH);
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
  for (let i = 0; i < 4; i++) {
    for (let y = 0; y < 3; y++) {
      const alreadyIn = JSON.parse(
        readFileSync("./shops/basko/basko.json", "utf-8")
      );

      const ret = await worker.recognize(`./shops/basko/parts/cut${i}-${y}.jpg`);
      //   console.log(
      //     ret.data.words
      //       .map((b, i) => `i: ${i}: ${b.text}\n`)
      //       .join("")
      //   );
      const name = ret.data.words.map((w) => w.text).join(" ");
      // remove stopwords?
      //   image will be the portion analyzed cut in the right bottom corner
      const final = {
        store: "basko",
        img: `./shops/basko/cut${i}-${y}.jpg`, //needs cloudinary
        name,
      };
      alreadyIn.push(final);
      writeFileSync("./shops/basko/basko.json", JSON.stringify(alreadyIn));
    }
  }
  await worker.terminate();
})();
