import express from "express";
import { config } from "./config.js";

export function createApp() {
  const app = express();
  app.get("/health", (_req, res) => {
    res.json({ ok: true, network: config.NEAR_NETWORK });
  });
  return app;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()!)) {
  createApp().listen(config.PORT, () => console.log(`Warden backend on :${config.PORT}`));
}
