import { Router } from "express"
import Product from "../../schemas/product.schema.js"
// import { db } from "../../index.js";
import q2m from "query-to-mongo"
import { StemmerIt, StopwordsIt } from "@nlpjs/lang-it"
import { Logger } from "../../../shops/logger.js"
import compare from "js-levenshtein"
const prodRoute = Router()

prodRoute.get("/", async (req, res, next) => {
  let { page, size, store: stores, order, price } = req.query
  const query = q2m(req.url.split("?")[1], {
    ignore: ["store", "page", "order"],
  })
  if (price && price.includes("null")) {
    query.criteria.price.$ne = null
  }
  const storeQ = { $or: [] }
  for (const store of stores?.split(",")) {
    if (store.length > 0) {
      storeQ.$or.push({
        store: store.toLowerCase().replaceAll(" ", "-"),
      })
    }
  }
  if (!page) page = 1
  if (!size) size = 20
  const nlp = new StemmerIt()
  const commonQ = {
    ...query.criteria,
    ...storeQ,
    prodName:
      query.criteria.prodName && query.criteria.prodName.length > 0
        ? {
            $regex: new RegExp(`${nlp.stemWord(query.criteria.prodName)}`, "i"),
          }
        : undefined,
  }
  Logger.debug(commonQ)
  const count = await Product.find(
    query.criteria.prodName && query.criteria.prodName.length > 0
      ? commonQ
      : { ...storeQ, ...query.criteria }
  ).count()
  const prods = await Product.find(
    query.criteria.prodName && query.criteria.prodName.length > 0
      ? commonQ
      : { ...storeQ, ...query.criteria }
  )
    .limit(size)
    .skip(size * (page - 1))
    .sort({ [order]: 1 })
  const basko = await Product.find({ store: "basko" })
  let suggestions = []
  if (query.criteria.prodName?.length > 0) {
    suggestions = basko.filter((prod) => {
      // const stopwords = new StopwordsIt()
      const words = prod.prodName.split(" ")
      const similar = words.some((word) => {
       
        const comparison = compare(
          word.trim().toLowerCase(),
          query.criteria.prodName.toLowerCase()
        )
        if (comparison === 0) return true
        return comparison < 2
      })
      return similar
    })
  }
  res.send({
    data: prods,
    suggestions,
    count,
    next:
      prods.length > 0
        ? `${process.env.URL}products?page=${parseInt(page) + 1}`
        : null,
    prev:
      parseInt(page) > 1
        ? `${process.env.URL}products?page=${parseInt(page) - 1}`
        : null,
  })
})

export default prodRoute
