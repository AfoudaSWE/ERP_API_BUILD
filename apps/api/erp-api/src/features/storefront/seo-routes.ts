import { Router } from "express";
import { query } from "../../db/client.js";
import { publicWhere } from "./catalog-service.js";
import { getActiveStore } from "./store.js";

function xml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const storefrontSeoRouter = Router();

storefrontSeoRouter.get("/robots.txt", (request, response) => {
  const origin = `${request.protocol}://${request.get("host")}`;
  response
    .type("text/plain")
    .send(
      `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`,
    );
});

storefrontSeoRouter.get("/sitemap.xml", async (request, response) => {
  const store = await getActiveStore();
  const origin = `${request.protocol}://${request.get("host")}`;
  const [products, categories] = await Promise.all([
    query<{ slug: string; updated_at: string }>(
      `SELECT p.slug,p.updated_at FROM products p WHERE ${publicWhere} ORDER BY p.updated_at DESC`,
      [store.company_id],
    ),
    query<{ slug: string; updated_at: string }>(
      `SELECT slug,updated_at FROM categories WHERE company_id=$1 AND type='product' AND is_active=true ORDER BY updated_at DESC`,
      [store.company_id],
    ),
  ]);
  const urls = [
    { path: "/", lastmod: new Date().toISOString() },
    { path: "/products", lastmod: new Date().toISOString() },
    ...categories.rows.map((row) => ({
      path: `/products?category=${encodeURIComponent(row.slug)}`,
      lastmod: row.updated_at,
    })),
    ...products.rows.map((row) => ({
      path: `/product/${encodeURIComponent(row.slug)}`,
      lastmod: row.updated_at,
    })),
  ];
  response
    .type("application/xml")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
        .map(
          ({ path, lastmod }) =>
            `<url><loc>${xml(origin + path)}</loc><lastmod>${new Date(lastmod).toISOString()}</lastmod></url>`,
        )
        .join("")}</urlset>`,
    );
});
