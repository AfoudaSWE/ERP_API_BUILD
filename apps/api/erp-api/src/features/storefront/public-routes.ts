import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/client.js";
import { HttpError, validate } from "../../lib/http.js";
import { getActiveStore, mapSettings } from "./store.js";
import {
  getPublicProductRow,
  listPublicProducts,
  mapPublicProduct,
  publicWhere,
} from "./catalog-service.js";
import { cartRouter, checkoutRouter } from "./cart-routes.js";
import { customerAuthRouter, customerRouter } from "./customer-routes.js";

const productQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  brand: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  availability: z.enum(["in_stock", "out_of_stock"]).optional(),
  sort: z
    .enum(["relevance", "newest", "price-asc", "price-desc", "discount"])
    .default("relevance"),
});
export const publicStorefrontRouter = Router();
publicStorefrontRouter.get("/configuration", async (_req, res) =>
  res.json({ data: mapSettings(await getActiveStore()) }),
);
publicStorefrontRouter.get("/products", async (req, res) => {
  const store = await getActiveStore(),
    input = validate(productQuery, req.query);
  const result = await listPublicProducts(store.company_id, input);
  res.json({
    data: result.products,
    meta: { page: input.page, pageSize: input.pageSize, total: result.total },
  });
});
publicStorefrontRouter.get("/products/:slug/related", async (req, res) => {
  const store = await getActiveStore(),
    current = await getPublicProductRow(store.company_id, req.params.slug);
  if (!current)
    throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product not found");
  const result = await listPublicProducts(store.company_id, {
    page: 1,
    pageSize: 4,
    category: current.category_id ?? undefined,
    excludeId: current.id,
    sort: "newest",
  });
  res.json({ data: result.products });
});
publicStorefrontRouter.get("/products/:slug/reviews", async (req, res) => {
  const store = await getActiveStore(),
    current = await getPublicProductRow(store.company_id, req.params.slug);
  if (!current)
    throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product not found");
  const rows = await query(
    `SELECT id,rating,title,body,created_at FROM product_reviews WHERE company_id=$1 AND product_id=$2 AND status='approved' ORDER BY created_at DESC LIMIT 50`,
    [store.company_id, current.id],
  );
  res.json({
    data: rows.rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.created_at,
    })),
  });
});
publicStorefrontRouter.get("/products/:slug", async (req, res) => {
  const store = await getActiveStore(),
    row = await getPublicProductRow(store.company_id, req.params.slug);
  if (!row) throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product not found");
  const product = mapPublicProduct(row);
  const [media, variants] = await Promise.all([
    query(
      `SELECT id,url,thumbnail_url,alt_text,media_type,width,height FROM product_media WHERE company_id=$1 AND product_id=$2 ORDER BY position,id`,
      [store.company_id, row.id],
    ),
    query(
      `SELECT id,sku,name,attributes,selling_price,compare_at_price,stock_quantity,image_url FROM product_variants WHERE company_id=$1 AND product_id=$2 AND is_active=true ORDER BY created_at,id`,
      [store.company_id, row.id],
    ),
  ]);
  res.json({
    data: {
      ...product,
      media: media.rows.map((m) => ({
        id: m.id,
        url: m.url,
        thumbnailUrl: m.thumbnail_url,
        altText: m.alt_text || row.name,
        mediaType: m.media_type,
        width: m.width,
        height: m.height,
      })),
      variants: variants.rows.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        attributes: v.attributes,
        price: Number(v.selling_price),
        originalPrice:
          v.compare_at_price === null ? null : Number(v.compare_at_price),
        stockQuantity: Number(v.stock_quantity),
        imageUrl: v.image_url,
        availability:
          Number(v.stock_quantity) <= 0
            ? "out_of_stock"
            : Number(v.stock_quantity) <= Number(row.reorder_level)
              ? "low_stock"
              : "in_stock",
      })),
    },
  });
});
publicStorefrontRouter.get("/categories", async (_req, res) => {
  const store = await getActiveStore();
  const rows = await query(
    `SELECT c.id,c.parent_id,c.slug,c.name,c.name_ar,c.image_url,count(p.id)::int product_count FROM categories c LEFT JOIN products p ON p.category_id=c.id AND p.company_id=c.company_id AND p.is_active=true AND p.storefront_visible=true AND p.commerce_status='active' AND p.published_at<=now() WHERE c.company_id=$1 AND c.type='product' AND c.is_active=true GROUP BY c.id ORDER BY c.name`,
    [store.company_id],
  );
  res.json({
    data: rows.rows.map((c) => ({
      id: c.id,
      parentId: c.parent_id,
      slug: c.slug,
      name: c.name,
      nameAr: c.name_ar,
      imageUrl: c.image_url,
      productCount: Number(c.product_count),
    })),
  });
});
publicStorefrontRouter.get("/brands", async (_req, res) => {
  const store = await getActiveStore();
  const rows = await query(
    `SELECT brand name,count(*)::int product_count FROM products p WHERE ${publicWhere} AND brand IS NOT NULL AND trim(brand)<>'' GROUP BY brand ORDER BY brand`,
    [store.company_id],
  );
  res.json({
    data: rows.rows.map((b) => ({
      name: b.name,
      productCount: Number(b.product_count),
    })),
  });
});
publicStorefrontRouter.get("/search/suggestions", async (req, res) => {
  const store = await getActiveStore(),
    q = validate(z.string().trim().min(2).max(80), req.query.q);
  const products = await listPublicProducts(store.company_id, {
    page: 1,
    pageSize: 5,
    search: q,
    sort: "relevance",
  });
  const [categories, brands] = await Promise.all([
    query(
      `SELECT id,parent_id,slug,name,name_ar,image_url,0 product_count FROM categories WHERE company_id=$1 AND type='product' AND is_active=true AND (name ILIKE $2 OR name_ar ILIKE $2) LIMIT 5`,
      [store.company_id, `%${q}%`],
    ),
    query(
      `SELECT brand name,count(*)::int product_count FROM products p WHERE ${publicWhere} AND brand ILIKE $2 GROUP BY brand LIMIT 5`,
      [store.company_id, `%${q}%`],
    ),
  ]);
  res.json({
    data: {
      products: products.products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        nameAr: p.nameAr,
        price: p.price,
        originalPrice: p.originalPrice,
        discountPercent: p.discountPercent,
        currency: p.currency,
        primaryImage: p.primaryImage,
      })),
      categories: categories.rows.map((c) => ({
        id: c.id,
        parentId: c.parent_id,
        slug: c.slug,
        name: c.name,
        nameAr: c.name_ar,
        imageUrl: c.image_url,
        productCount: 0,
      })),
      brands: brands.rows.map((b) => ({
        name: b.name,
        productCount: Number(b.product_count),
      })),
    },
  });
});
publicStorefrontRouter.get("/navigation", async (_req, res) => {
  const store = await getActiveStore();
  const rows = await query(
    `SELECT id,parent_id,label,label_ar,target_type,target_value FROM storefront_navigation_items WHERE company_id=$1 AND status='published' AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now()) ORDER BY display_order,id`,
    [store.company_id],
  );
  const items = rows.rows.map((i) => ({
    id: i.id,
    parentId: i.parent_id,
    label: i.label,
    labelAr: i.label_ar,
    targetType: i.target_type,
    targetValue: i.target_value,
    children: [] as unknown[],
  }));
  const byId = new Map(items.map((i) => [i.id, i]));
  const roots: typeof items = [];
  for (const item of items) {
    const parent = item.parentId ? byId.get(item.parentId) : null;
    if (parent) parent.children.push(item);
    else roots.push(item);
  }
  res.json({ data: roots });
});
publicStorefrontRouter.get("/homepage", async (_req, res) => {
  const store = await getActiveStore();
  const rows = await query(
    `SELECT id,section_type,title,title_ar,subtitle,subtitle_ar,configuration,display_order FROM cms_homepage_sections WHERE company_id=$1 AND status='published' AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now()) ORDER BY display_order,id`,
    [store.company_id],
  );
  const sections = [];
  for (const row of rows.rows) {
    const configuration = row.configuration as Record<string, unknown>;
    let products;
    if (row.section_type === "product_grid") {
      const max = Math.min(
        12,
        Math.max(1, Number(configuration.maxItems) || 8),
      );
      const result = await listPublicProducts(store.company_id, {
        page: 1,
        pageSize: max,
        ids: Array.isArray(configuration.productIds)
          ? configuration.productIds.filter(
              (id): id is string => typeof id === "string",
            )
          : undefined,
        category:
          typeof configuration.category === "string"
            ? configuration.category
            : undefined,
        brand:
          typeof configuration.brand === "string"
            ? configuration.brand
            : undefined,
        sort:
          typeof configuration.sort === "string"
            ? configuration.sort
            : "newest",
      });
      products = result.products;
    }
    sections.push({
      id: row.id,
      sectionType: row.section_type,
      title: row.title,
      titleAr: row.title_ar,
      subtitle: row.subtitle,
      subtitleAr: row.subtitle_ar,
      configuration,
      displayOrder: row.display_order,
      products,
    });
  }
  res.json({ data: { settings: mapSettings(store), sections } });
});
publicStorefrontRouter.get("/shipping-methods", async (_req, res) => {
  const store = await getActiveStore();
  const rows = await query(
    `SELECT id,name,name_ar,description,fee,configuration FROM shipping_methods WHERE company_id=$1 AND is_enabled=true ORDER BY name`,
    [store.company_id],
  );
  res.json({
    data: rows.rows.map((m) => ({
      id: m.id,
      name: m.name,
      nameAr: m.name_ar,
      description: m.description,
      fee: Number(m.fee),
      configuration: m.configuration,
    })),
  });
});
publicStorefrontRouter.get("/payment-methods", async (_req, res) => {
  const store = await getActiveStore();
  const rows = await query(
    `SELECT id,code,name,name_ar,instructions,configuration FROM payment_methods WHERE company_id=$1 AND is_enabled=true ORDER BY name`,
    [store.company_id],
  );
  res.json({
    data: rows.rows.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      nameAr: m.name_ar,
      instructions: m.instructions,
      configuration: m.configuration,
    })),
  });
});
publicStorefrontRouter.use("/cart", cartRouter);
publicStorefrontRouter.use("/checkout", checkoutRouter);
publicStorefrontRouter.use("/customer-auth", customerAuthRouter);
publicStorefrontRouter.use("/customer", customerRouter);
