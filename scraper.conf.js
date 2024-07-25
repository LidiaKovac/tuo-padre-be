
let config;
if (process.env.NODE_ENV === 'production') {
    config = await import('./scraper.config.json', { assert: { type: "json" } });
} else {
    config = await import('./scraper.config.dev.json', { assert: { type: "json" } });
}
export default config.default