import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  // Serve CRM static files from client/public/crm (dev mode)
  // Must be registered BEFORE vite.middlewares to avoid the SPA catch-all
  const crmPublicPath = path.resolve(import.meta.dirname, "../..", "client", "public", "crm");
  if (fs.existsSync(crmPublicPath)) {
    app.use("/crm", express.static(crmPublicPath));
    app.get("/crm", (_req, res) => res.sendFile(path.resolve(crmPublicPath, "index.html")));
    app.get("/crm/*splat", (_req, res) => res.sendFile(path.resolve(crmPublicPath, "index.html")));
  }

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Serve CRM static files FIRST — before the SPA catch-all
  // In production, client/public/crm is copied to dist/public/crm by Vite build
  const crmDistPath = path.resolve(distPath, "crm");
  if (fs.existsSync(crmDistPath)) {
    console.log(`[CRM] Serving CRM from: ${crmDistPath}`);
    app.use("/crm", express.static(crmDistPath));
    app.get("/crm", (_req, res) => res.sendFile(path.resolve(crmDistPath, "index.html")));
    app.get("/crm/*splat", (_req, res) => res.sendFile(path.resolve(crmDistPath, "index.html")));
  } else {
    console.warn(`[CRM] CRM directory not found at: ${crmDistPath}`);
  }

  // Serve main React SPA static files
  app.use(express.static(distPath));

  // SPA fallback — must be LAST
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
