import express from "express";
import { readFileSync } from "fs";
import cron from "node-cron";
import { Scraper } from "../shops/scraper.js";
import { Logger } from "../shops/logger.js";
import prodRoute from "./services/products/index.js";
import listEndpoints from "express-list-endpoints";
import { Database } from "./db.js";
import dotenv from "dotenv"
import cors from "cors"
dotenv.config()
const app = express();

app.use(cors())
app.use("*", (req,res,next) => {
    Logger.log(`Request: ${req.method.toUpperCase()} ${req.originalUrl}`)
    next()
})
app.use("/products", prodRoute);



export const db = new Database();
Logger.log("Scheduling jobs...");
cron.schedule("00 00 * * FRI", () => {
  // cron.schedule("36 16 * * TUE", () => {
  console.log("Running every friday @ 00:00");
  Scraper.scrapeAll();
});

app.listen(3001, () => {
  Logger.log("🌝 API is up! 🌚");
  console.table(listEndpoints(app));
});
