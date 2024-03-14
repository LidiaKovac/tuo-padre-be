import { Router } from "express";
import { db } from "../../index.js";

const prodRoute = Router();

prodRoute.get("/", async (req, res, next) => {
  /* 
        Available params: 
            - page (int), default = 1
            - size (int), default = 20
    */
  let { page, size } = req.query;
  if (!page) page = 1;
  if (!size) size = 20;
  res.send(db.findAll(page, size));
});

export default prodRoute;
