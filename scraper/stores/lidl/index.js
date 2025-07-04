import { acceptCookies, launchBrowser } from "../../scraper.utils"
import config from "../../scraper.config.json" with {type: "json"}
export const scrapeLidl = async() => {
    const { page, browser } = await launchBrowser("https://www.lidl.it/c/volantino-lidl/s10018048?ar=55100", "")
    
    await acceptCookies(page, config.cookies.onetrust)
    const selectors = config.lidl
}