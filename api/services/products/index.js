import { Router } from "express";
import { db } from "../../index.js";

const prodRoute = Router();

prodRoute.get("/", async (req, res, next) => {
  /* 
        Available params: 
            - page (int), default = 1
            - size (int), default = 20
    */
  let { page, size, query } = req.query;
  if (!page) page = 1;
  if (!size) size = 20;
  if (query) res.send(db.findByName(query, page, size))
  else res.send(db.findAll(page, size));
});

export default prodRoute;
