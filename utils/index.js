import { readFileSync, writeFileSync } from "fs";
import { Logger } from "../shops/logger.js";

export function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

export const scrollToBottom = async (page) => {
  let currHeight = 0;
  let maxHeight = await page.evaluate("document.body.scrollHeight");
  while (currHeight < maxHeight) {
    // Scroll to the bottom of the page
    await page.evaluate(`window.scrollTo(0, ${currHeight})`);
    // Wait for page load
    await delay(100);

    currHeight += 500;
    maxHeight = await page.evaluate("document.body.scrollHeight");
    // Calculate new scroll height and compare
  }
};

export const addToJSONFile = (path, content) => {
  try {
    Logger.level(1).log("Phase 3️⃣ - Writing on local file.");

    let prev = JSON.parse(readFileSync(path, "utf-8"));
    let counter = {
      added: 0,
      notAdded: 0,
    };
    if (content.length) {
      content.forEach((c) => {
        const prodNames = prev.map((el) => el.prodName);
        if (!prodNames.includes(c.prodName)) {
          Logger.debug("Added product with name:" + c.prodName);
          counter.added++;
          prev.push(c);
        } else {
          Logger.debug("Skipped product with name: " + c.prodName);
          counter.notAdded++;
        }
      });
    } else {
      const prodNames = prev.map((el) => el.prodName);
      if (!prodNames.includes(content.prodName)) {
        counter.added++;
        Logger.level(1).debug("Added product with name: " + content.prodName);
        prev.push(content);
      } else {
        counter.notAdded++;
        Logger.level(1).debug("Skipped product with name: " + content.prodName);
      }
    }
    Logger.level(1).log(
      `Added ${counter.added} products, skipped ${counter.notAdded}. - Total products: ${prev.length}`
    );
    writeFileSync(path, JSON.stringify(prev));
    return prev;
  } catch (error) {
    Logger.level(1).error(error);
  }
};
