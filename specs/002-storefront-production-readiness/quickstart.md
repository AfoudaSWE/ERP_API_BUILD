# Validation Quickstart

## Prerequisites

- PostgreSQL and ERP API configured through repository environment files.
- Storefront database migrations and live catalog seed/import completed.

## Run

```powershell
npm.cmd run dev:ecommerce
```

Open `http://127.0.0.1:4202`.

## Validate

1. Switch Arabic/English and verify RTL/LTR across header, catalog, product, cart, checkout, and account.
2. Search a live product, open it, select an available variant, add to cart, change quantity, and refresh.
3. Authenticate, enter delivery information, choose server methods, place once, and view order history/details.
4. Test keyboard navigation and widths 320, 390, 768, 1024, and 1440px.

## Checks

```powershell
npx.cmd nx lint ecom_interface
npx.cmd nx typecheck ecom_interface
npx.cmd nx test ecom_interface
npx.cmd nx build ecom_interface
```
