import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { ProductCard } from "./index.js";
const product = {
  id: "1",
  slug: "phone",
  sku: "P1",
  name: "Phone",
  nameAr: "",
  description: "",
  descriptionAr: "",
  price: 100,
  originalPrice: 125,
  discountPercent: 20,
  currency: "EGP",
  taxRate: 14,
  stockQuantity: 0,
  availability: "out_of_stock" as const,
  rating: null,
  reviewCount: 0,
  hasVariants: false,
  publishedAt: "2026-01-01",
};
describe("ProductCard", () => {
  it("renders API price, discount and out-of-stock state", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ProductCard product={product} onAdd={() => undefined} />
      </MemoryRouter>,
    );
    expect(html).toContain("EGP");
    expect(html).toContain("-20%");
    expect(html).toContain("Out of stock");
    expect(html).toContain("disabled");
  });

  it("does not invent discount or rating content when the API omits it", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ProductCard
          product={{ ...product, originalPrice: null, discountPercent: null }}
          onAdd={() => undefined}
        />
      </MemoryRouter>,
    );
    expect(html).not.toContain("sf-discount");
    expect(html).not.toContain("sf-rating");
  });

  it("sends products with variants to the option-selection flow", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ProductCard
          product={{
            ...product,
            availability: "in_stock",
            stockQuantity: 5,
            hasVariants: true,
          }}
          onAdd={() => undefined}
        />
      </MemoryRouter>,
    );
    expect(html).toContain("Select options");
    expect(html).not.toContain("disabled");
  });
});
