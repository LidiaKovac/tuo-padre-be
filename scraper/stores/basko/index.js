export const scrapeBasko = () => {}



  
// static async scrapeBasko() {
//     Logger.warning("Basko currently works with PDFs. We are currently working on a solution.")
//     // let worker = await createWorker("ita_old")
//     try {
//       // Logger.level(1).log("Phase 1️⃣ - Cleaning up cloudinary and local files")

//       // const baskoPath = path.resolve(__dirname, "..", "shops", "basko")
//       // await configCloudinary()

//       // await cloudinary.api.delete_resources_by_prefix("shopping")
//       // await cloudinary.api.delete_resources_by_prefix("flyers")
//       // Logger.level(1).log("Phase 2️⃣ - Upscaling and cropping")

//       // await upscaleAndCrop(3.5, baskoPath)

//       // let images = []
//       // const folders = await readdir(path.resolve(baskoPath, "parts"))
//       // Logger.level(1).log("Phase 3️⃣ - Uploading images")

//       // const data = []
//       // for (const folder of folders) {
//       //   images = await uploadImages(folder, baskoPath)
//       //   Logger.level(2).log("Performing OCR")
//       //   for (const { secure_url: img } of images) {
//       //     const ret = await worker.recognize(img)
//       //     const prodName = ret.data.words.map((w) => w.text).join(" ")
//       //     const final = {
//       //       store: "basko",
//       //       img,
//       //       prodName: prodName.replaceAll(/[^A-Z0-9\s]+/ig, "")
//       //     }
//       //     data.push(final)
//       //   }
//       // }
//       // await addToMongo(data)
//       // await worker.terminate()
//       // await cleanup(baskoPath)
//     } catch (error) {
//       console.log(error)
//       Logger.error(error)
//       await worker.terminate()
//     }
//   }
  
// }
