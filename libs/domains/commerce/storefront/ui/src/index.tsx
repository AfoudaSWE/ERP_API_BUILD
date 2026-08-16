import {
  Heart,
  ImageOff,
  PackageSearch,
  ShoppingCart,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { StorefrontProduct } from "@erp/commerce-storefront-contracts";

export function Container({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`sf-container ${className}`} {...props}>
      {children}
    </div>
  );
}
export function Price({
  price,
  originalPrice,
  currency,
  locale = "en",
}: {
  price: number;
  originalPrice?: number | null;
  currency: string;
  locale?: string;
}) {
  const format = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
  return (
    <div className="sf-price">
      <strong>{format.format(price)}</strong>
      {originalPrice && originalPrice > price ? (
        <del>{format.format(originalPrice)}</del>
      ) : null}
    </div>
  );
}
export function ProductImage({
  product,
  priority = false,
}: {
  product: StorefrontProduct;
  priority?: boolean;
}) {
  const image = product.primaryImage;
  return (
    <div className="sf-product-image">
      {image ? (
        <img
          src={image.thumbnailUrl || image.url}
          alt={image.altText || product.name}
          width={image.width || 600}
          height={image.height || 600}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onError={(event) => {
            event.currentTarget.hidden = true;
            event.currentTarget.nextElementSibling?.removeAttribute("hidden");
          }}
        />
      ) : null}
      <div className="sf-image-fallback" hidden={Boolean(image)}>
        <ImageOff aria-hidden="true" />
        <span>Image unavailable</span>
      </div>
    </div>
  );
}
export function DiscountBadge({ percent }: { percent?: number | null }) {
  return percent && percent > 0 ? (
    <span className="sf-discount">-{percent}%</span>
  ) : null;
}
export function Rating({
  rating,
  count,
}: {
  rating: number | null;
  count: number;
}) {
  return rating === null ? null : (
    <span
      className="sf-rating"
      aria-label={`${rating} out of 5 from ${count} reviews`}
    >
      <Star fill="currentColor" aria-hidden="true" />
      {rating.toFixed(1)} <small>({count})</small>
    </span>
  );
}
export function ProductCard({
  product,
  onAdd,
  variant = "standard",
}: {
  product: StorefrontProduct;
  onAdd(product: StorefrontProduct): void | Promise<void>;
  variant?: "standard" | "compact" | "horizontal" | "promotional";
}) {
  const unavailable = product.availability === "out_of_stock";
  return (
    <article className={`sf-product-card sf-product-card--${variant}`}>
      <Link to={`/product/${product.slug}`} className="sf-card-media">
        <ProductImage product={product} />
        <DiscountBadge percent={product.discountPercent} />
        <span className={`sf-stock sf-stock--${product.availability}`}>
          {unavailable
            ? "Out of stock"
            : product.availability === "low_stock"
              ? "Low stock"
              : "In stock"}
        </span>
      </Link>
      <div className="sf-card-body">
        <div className="sf-card-brand">
          {product.brand || product.categoryName || " "}
        </div>
        <Link to={`/product/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <Rating rating={product.rating} count={product.reviewCount} />
        <Price
          price={product.price}
          originalPrice={product.originalPrice}
          currency={product.currency}
        />
        <div className="sf-card-actions">
          <button
            className="sf-icon-button"
            type="button"
            aria-label={`Save ${product.name}`}
          >
            <Heart />
          </button>
          <button
            className="sf-button sf-button--primary"
            type="button"
            disabled={unavailable}
            onClick={() => void onAdd(product)}
          >
            {product.hasVariants ? (
              "Select options"
            ) : (
              <>
                <ShoppingCart />
                Add
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="sf-product-grid" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <div className="sf-skeleton-card" key={i}>
          <div />
          <span />
          <span />
          <strong />
        </div>
      ))}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="sf-state">
      <PackageSearch />
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry(): void;
}) {
  return (
    <section className="sf-state sf-state--error" role="alert">
      <h2>Something went wrong</h2>
      <p>{message}</p>
      <button className="sf-button" onClick={retry}>
        Try again
      </button>
    </section>
  );
}
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="sf-section-header">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage(page: number): void;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="sf-pagination" aria-label="Product pages">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </nav>
  );
}
