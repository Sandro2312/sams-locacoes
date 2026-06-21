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
    // redirect:false evita o "Redirecting to /crm/" que trava Edge e mobile
    app.get("/crm", (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.resolve(crmPublicPath, "index.html"));
    });
    app.use("/crm", express.static(crmPublicPath, {
      redirect: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get("/crm/*splat", (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.resolve(crmPublicPath, "index.html"));
    });
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
  // Detect the correct dist path — try both locations to support dev and production
  const candidates = [
    path.resolve(import.meta.dirname, "public"),           // production: server/_core/public
    path.resolve(import.meta.dirname, "../..", "dist", "public"), // dev fallback: dist/public
  ];
  const distPath = candidates.find(fs.existsSync) ?? candidates[0];

  console.log(`[Static] Serving from: ${distPath}`);

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
    // JS/CSS com ?v= no URL: cache de 1 ano (imutável)
    // HTML e arquivos sem versão: sem cache (sempre busca novo)
    // redirect:false evita o "Redirecting to /crm/" que trava Edge e mobile
    app.get("/crm", (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.resolve(crmDistPath, "index.html"));
    });
    app.use("/crm", express.static(crmDistPath, {
      redirect: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
          // no-store + Surrogate-Control garante que Cloudflare e browsers não façam cache
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('Surrogate-Control', 'no-store');
        }
      }
    }));
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
