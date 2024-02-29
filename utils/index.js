export function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

export const scrollToBottom = async (page) => {
  let currHeight = 0;
  let maxHeight = await page.evaluate("document.body.scrollHeight");
  console.log("Waiting for scroll...");
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
