import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";

// Serves the api/ functions during `npm run dev`, the same way
// Vercel serves it in production, so the app can be tested locally.
function devApi(): Plugin {
  return {
    name: "dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const route = req.url?.split("?")[0];
        if (
          route !== "/api/advisor" &&
          route !== "/api/feedback" &&
          route !== "/api/register" &&
          route !== "/api/tts" &&
          route !== "/api/telegram"
        )
          return next();
        const body = await readBody(req);
        const request = new Request(`http://localhost${req.url}`, {
          method: req.method,
          headers: { "content-type": "application/json" },
          body: req.method === "POST" ? body : undefined,
        });
        const handlers = await server.ssrLoadModule(`${route}.ts`);
        const handler = handlers[req.method ?? "GET"];
        if (!handler) {
          res.statusCode = 405;
          return res.end();
        }
        const response: Response = await handler(request);
        res.statusCode = response.status;
        for (const [key, val] of response.headers.entries()) {
          res.setHeader(key, val);
        }
        const buf = Buffer.from(await response.arrayBuffer());
        res.end(buf);
      });
    },
  };
}

// Writes /sw.js from src/sw-template.js with the exact list of built files,
// so the whole app is stored on the phone after the first visit.
const PUBLIC_FILES = [
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

function serviceWorker(): Plugin {
  return {
    name: "service-worker",
    apply: "build",
    generateBundle(_, bundle) {
      const built = Object.keys(bundle).filter((f) => f !== "index.html").map((f) => `/${f}`);
      const precache = ["/", ...built, ...PUBLIC_FILES];
      const version = createHash("sha256").update(precache.join("\n")).digest("hex").slice(0, 12);
      const source = readFileSync("src/sw-template.js", "utf8")
        .replace("__VERSION__", version)
        .replace("__PRECACHE__", JSON.stringify(precache));
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export default defineConfig(({ mode }) => {
  // Make GEMINI_API_KEY from .env.local visible to the dev API.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return { plugins: [react(), tailwindcss(), devApi(), serviceWorker()] };
});
