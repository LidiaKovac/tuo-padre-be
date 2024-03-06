import { createWorker } from "tesseract.js";
(async () => {
  const worker = await createWorker("ita_old");
  const ret = await worker.recognize("./shops/basko/part 2.png");
  //   console.log(
  //     ret.data.words
  //       .map((b, i) => `i: ${i}: ${b.text}\n`)
  //       .join("")
  //   );

  const price = ret.data.words[1].text;
  const name = ret.data.words
    .slice(7)
    .map((w) => w.text)
    .join(" ");
  // remove stopwords?
  //   image will be the portion analyzed cut in the right bottom corner
  console.log(price, name);
  await worker.terminate();
})();
