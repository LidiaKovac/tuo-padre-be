import { Router } from "express"
import Product from "../../schemas/product.schema.js"
// import { db } from "../../index.js";
import q2m from "query-to-mongo"
const prodRoute = Router()

prodRoute.get("/", async (req, res, next) => {
  /* 
        Available params: 
            - page (int), default = 1
            - size (int), default = 20
    */
  const query = q2m(req.url.split("?")[1])
  let { page, size } = req.query
  if (!page) page = 1
  if (!size) size = 20
  const q = {
    ...query.criteria,
    prodName: query.criteria.prodName ? { $regex: query.criteria.prodName } : "",

  }
  console.log(query)
  const count = await Product.find({
    ...q,
    // price: {
    //   $exists: true
    // }
  }).count()
  const prods = await Product.find(q, null, {
    limit: size,
    skip: size * page - 1,
  })
  console.log(prods)
  // if (query) res.send(db.findByName(query, page, size))
  res.send({
    data: prods,
    count,
    next:
      prods.length > 0 ? `${process.env.URL}products?page=${page + 1}` : null,
    prev: page > 1 ? `${process.env.URL}products?page=${page - 1}` : null,
  })
})

export default prodRoute
