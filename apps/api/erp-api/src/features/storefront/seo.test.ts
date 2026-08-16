import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";

describe("Storefront SEO endpoints", () => {
  it("publishes crawl rules without exposing API routes", async () => {
    const response = await request(createApp()).get("/robots.txt");
    expect(response.status).toBe(200);
    expect(response.text).toContain("Disallow: /api/");
    expect(response.text).toContain("/sitemap.xml");
  });

  it("builds an XML sitemap from published database records", async () => {
    const response = await request(createApp()).get("/sitemap.xml");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/xml");
    expect(response.text).toContain("<urlset");
    expect(response.text).toContain("/product/");
  });
});
