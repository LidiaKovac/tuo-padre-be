import {Scraper} from "./scraper.js"
try {

    Scraper.scrapeAll();
  
  } catch (error) {
    Logger.error(error)
  }