import { Router } from "express";
import { z } from "zod";
import {
  commerceProductInputSchema,
  commerceProductPatchSchema,
  commerceProductQuerySchema,
} from "@erp/commerce-catalog-contracts";
import { CatalogApplication } from "@erp/commerce-catalog-application";
import { query } from "../../db/client.js";
import { HttpError, validate } from "../../lib/http.js";
import { serializeRows } from "../../lib/rows.js";
import { authorizeAny } from "../auth/middleware.js";
import { PgProductRepository } from "./catalog-repository.js";

const catalog = new CatalogApplication(new PgProductRepository());
const uuidParam = z.uuid();
export const commerceRouter = Router();
const cmsSectionSchema = z.object({
  sectionType: z.enum([
    "hero",
    "category_grid",
    "product_grid",
    "brand_grid",
    "promo_banner",
    "service_benefits",
    "newsletter",
    "seo_content",
  ]),
  title: z.string().max(180).default(""),
  titleAr: z.string().max(180).default(""),
  subtitle: z.string().max(500).default(""),
  subtitleAr: z.string().max(500).default(""),
  configuration: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  displayOrder: z.number().int().min(0).default(0),
  startsAt: z.iso.datetime().nullable().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
});
const navigationSchema = z.object({
  parentId: z.uuid().nullable().optional(),
  label: z.string().min(1).max(120),
  labelAr: z.string().max(120).default(""),
  targetType: z.enum(["category", "brand", "collection", "url"]),
  targetValue: z.string().min(1).max(500),
  displayOrder: z.number().int().min(0).default(0),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  startsAt: z.iso.datetime().nullable().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
});
const storefrontSettingsSchema = z.object({
  storeName: z.string().min(1).max(160),
  storeNameAr: z.string().max(160).default(""),
  currency: z.string().regex(/^[A-Z]{3}$/),
  defaultLocale: z.enum(["en", "ar"]),
  supportPhone: z.string().max(40).nullable().optional(),
  supportEmail: z.email().nullable().optional(),
  seoTitle: z.string().max(180).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
  socialImageUrl: z.url().nullable().optional(),
  configuration: z.record(z.string(), z.unknown()).default({}),
});

commerceRouter.get(
  "/products",
  authorizeAny("commerce.products.read", "products.read", "products.view"),
  async (request, response) => {
    const input = validate(commerceProductQuerySchema, request.query);
    const page = await catalog.listProducts(request.auth!.companyId, input);
    response.json({
      data: page.items,
      meta: { page: page.page, pageSize: page.pageSize, total: page.total },
    });
  },
);

commerceRouter.get(
  "/products/:id",
  authorizeAny("commerce.products.read", "products.read", "products.view"),
  async (request, response) => {
    const product = await catalog.getProduct(
      request.auth!.companyId,
      validate(uuidParam, request.params.id),
    );
    if (!product)
      throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product not found");
    response.json({ data: product });
  },
);

commerceRouter.post(
  "/products",
  authorizeAny("commerce.products.create", "products.create", "products.write"),
  async (request, response) => {
    const product = await catalog.createProduct(
      request.auth!.companyId,
      validate(commerceProductInputSchema, request.body),
    );
    response.status(201).json({ data: product });
  },
);

commerceRouter.patch(
  "/products/:id",
  authorizeAny("commerce.products.update", "products.update", "products.write"),
  async (request, response) => {
    const id = validate(uuidParam, request.params.id);
    const current = await catalog.getProduct(request.auth!.companyId, id);
    if (!current)
      throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product not found");
    const patch = validate(commerceProductPatchSchema, request.body);
    const input = validate(commerceProductInputSchema, {
      ...current,
      ...patch,
      barcode: patch.barcode ?? current.barcode ?? undefined,
      categoryId: patch.categoryId ?? current.categoryId ?? undefined,
      brand: patch.brand ?? current.brand ?? undefined,
    });
    const product = await catalog.updateProduct(
      request.auth!.companyId,
      id,
      input,
    );
    if (!product)
      throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product not found");
    response.json({ data: product });
  },
);

commerceRouter.get(
  "/categories",
  authorizeAny("commerce.products.read", "products.read", "products.view"),
  async (request, response) => {
    const result = await query(
      "SELECT id,name,name_ar,is_active FROM categories WHERE company_id=$1 AND type=$2 ORDER BY name",
      [request.auth!.companyId, "product"],
    );
    response.json({ data: serializeRows(result.rows) });
  },
);

commerceRouter.get(
  "/cms/homepage-sections",
  authorizeAny("cms.storefront.manage", "cms.pages.manage"),
  async (request, response) => {
    const rows = await query(
      `SELECT * FROM cms_homepage_sections WHERE company_id=$1 ORDER BY display_order,id`,
      [request.auth!.companyId],
    );
    response.json({ data: serializeRows(rows.rows) });
  },
);
commerceRouter.post(
  "/cms/homepage-sections",
  authorizeAny("cms.storefront.manage", "cms.pages.manage"),
  async (request, response) => {
    const input = validate(cmsSectionSchema, request.body);
    const row = (
      await query(
        `INSERT INTO cms_homepage_sections(company_id,section_type,title,title_ar,subtitle,subtitle_ar,configuration,status,display_order,starts_at,ends_at)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)RETURNING *`,
        [
          request.auth!.companyId,
          input.sectionType,
          input.title,
          input.titleAr,
          input.subtitle,
          input.subtitleAr,
          input.configuration,
          input.status,
          input.displayOrder,
          input.startsAt ?? null,
          input.endsAt ?? null,
        ],
      )
    ).rows[0];
    response.status(201).json({ data: serializeRows([row])[0] });
  },
);
commerceRouter.patch(
  "/cms/homepage-sections/:id",
  authorizeAny("cms.storefront.manage", "cms.pages.manage"),
  async (request, response) => {
    const input = validate(cmsSectionSchema.partial(), request.body) as Record<
      string,
      unknown
    >;
    const columns: Record<string, string> = {
      sectionType: "section_type",
      title: "title",
      titleAr: "title_ar",
      subtitle: "subtitle",
      subtitleAr: "subtitle_ar",
      configuration: "configuration",
      status: "status",
      displayOrder: "display_order",
      startsAt: "starts_at",
      endsAt: "ends_at",
    };
    const entries = Object.entries(input);
    if (!entries.length)
      throw new HttpError(400, "EMPTY_UPDATE", "No fields supplied");
    const values = entries.map(([, v]) => v);
    values.push(request.params.id, request.auth!.companyId);
    const row = (
      await query(
        `UPDATE cms_homepage_sections SET ${entries.map(([k], i) => `${columns[k]}=$${i + 1}`).join(",")},updated_at=now() WHERE id=$${values.length - 1} AND company_id=$${values.length} RETURNING *`,
        values,
      )
    ).rows[0];
    if (!row)
      throw new HttpError(
        404,
        "SECTION_NOT_FOUND",
        "Homepage section not found",
      );
    response.json({ data: serializeRows([row])[0] });
  },
);
commerceRouter.delete(
  "/cms/homepage-sections/:id",
  authorizeAny("cms.storefront.manage", "cms.pages.manage"),
  async (request, response) => {
    const result = await query(
      `DELETE FROM cms_homepage_sections WHERE id=$1 AND company_id=$2 RETURNING id`,
      [request.params.id, request.auth!.companyId],
    );
    if (!result.rowCount)
      throw new HttpError(
        404,
        "SECTION_NOT_FOUND",
        "Homepage section not found",
      );
    response.status(204).send();
  },
);
commerceRouter.get(
  "/cms/navigation",
  authorizeAny("cms.storefront.manage", "cms.pages.manage"),
  async (request, response) => {
    const rows = await query(
      `SELECT * FROM storefront_navigation_items WHERE company_id=$1 ORDER BY display_order,id`,
      [request.auth!.companyId],
    );
    response.json({ data: serializeRows(rows.rows) });
  },
);
commerceRouter.post(
  "/cms/navigation",
  authorizeAny("cms.storefront.manage", "cms.pages.manage"),
  async (request, response) => {
    const input = validate(navigationSchema, request.body);
    const row = (
      await query(
        `INSERT INTO storefront_navigation_items(company_id,parent_id,label,label_ar,target_type,target_value,display_order,status,starts_at,ends_at)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)RETURNING *`,
        [
          request.auth!.companyId,
          input.parentId ?? null,
          input.label,
          input.labelAr,
          input.targetType,
          input.targetValue,
          input.displayOrder,
          input.status,
          input.startsAt ?? null,
          input.endsAt ?? null,
        ],
      )
    ).rows[0];
    response.status(201).json({ data: serializeRows([row])[0] });
  },
);
commerceRouter.patch(
  "/cms/navigation/:id",
  authorizeAny("cms.storefront.manage", "cms.pages.manage"),
  async (request, response) => {
    const input = validate(navigationSchema.partial(), request.body) as Record<
      string,
      unknown
    >;
    const columns: Record<string, string> = {
        parentId: "parent_id",
        label: "label",
        labelAr: "label_ar",
        targetType: "target_type",
        targetValue: "target_value",
        displayOrder: "display_order",
        status: "status",
        startsAt: "starts_at",
        endsAt: "ends_at",
      },
      entries = Object.entries(input);
    if (!entries.length)
      throw new HttpError(400, "EMPTY_UPDATE", "No fields supplied");
    const values = entries.map(([, v]) => v);
    values.push(request.params.id, request.auth!.companyId);
    const row = (
      await query(
        `UPDATE storefront_navigation_items SET ${entries.map(([k], i) => `${columns[k]}=$${i + 1}`).join(",")},updated_at=now() WHERE id=$${values.length - 1} AND company_id=$${values.length} RETURNING *`,
        values,
      )
    ).rows[0];
    if (!row)
      throw new HttpError(
        404,
        "NAVIGATION_NOT_FOUND",
        "Navigation item not found",
      );
    response.json({ data: serializeRows([row])[0] });
  },
);
commerceRouter.delete(
  "/cms/navigation/:id",
  authorizeAny("cms.storefront.manage", "cms.pages.manage"),
  async (request, response) => {
    const result = await query(
      `DELETE FROM storefront_navigation_items WHERE id=$1 AND company_id=$2 RETURNING id`,
      [request.params.id, request.auth!.companyId],
    );
    if (!result.rowCount)
      throw new HttpError(
        404,
        "NAVIGATION_NOT_FOUND",
        "Navigation item not found",
      );
    response.status(204).send();
  },
);
commerceRouter.get(
  "/cms/storefront-settings",
  authorizeAny("cms.storefront.manage", "cms.settings.manage"),
  async (request, response) => {
    const row = (
      await query(`SELECT * FROM storefront_settings WHERE company_id=$1`, [
        request.auth!.companyId,
      ])
    ).rows[0];
    response.json({ data: row ? serializeRows([row])[0] : null });
  },
);
commerceRouter.put(
  "/cms/storefront-settings",
  authorizeAny("cms.storefront.manage", "cms.settings.manage"),
  async (request, response) => {
    const input = validate(storefrontSettingsSchema, request.body);
    const row = (
      await query(
        `INSERT INTO storefront_settings(company_id,store_name,store_name_ar,currency,default_locale,support_phone,support_email,seo_title,seo_description,social_image_url,configuration)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)ON CONFLICT(company_id)DO UPDATE SET store_name=excluded.store_name,store_name_ar=excluded.store_name_ar,currency=excluded.currency,default_locale=excluded.default_locale,support_phone=excluded.support_phone,support_email=excluded.support_email,seo_title=excluded.seo_title,seo_description=excluded.seo_description,social_image_url=excluded.social_image_url,configuration=excluded.configuration,updated_at=now() RETURNING *`,
        [
          request.auth!.companyId,
          input.storeName,
          input.storeNameAr,
          input.currency,
          input.defaultLocale,
          input.supportPhone ?? null,
          input.supportEmail ?? null,
          input.seoTitle ?? null,
          input.seoDescription ?? null,
          input.socialImageUrl ?? null,
          input.configuration,
        ],
      )
    ).rows[0];
    response.json({ data: serializeRows([row])[0] });
  },
);
