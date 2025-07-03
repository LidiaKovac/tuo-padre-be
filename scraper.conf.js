
let config;
if (process.env.NODE_ENV === 'production') {
    config = await import('./scraper.config.json', { with: { type: "json" } });
} else {
    config = await import('./scraper.config.dev.json', { with: { type: "json" } });
}
export default config.default