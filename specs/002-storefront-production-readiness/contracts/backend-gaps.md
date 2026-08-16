# Missing Backend Contracts

These interfaces are required before transactional UI is enabled.

## Order cancellation

`POST /api/storefront/customer/orders/:id/cancellation`

Request: `{ "reason": "string" }`  
Response: updated order with status and cancellation audit reference. Server validates ownership and eligible order state.

## Return request

`POST /api/storefront/customer/orders/:id/returns`

Request: order-line quantities, reason code, comment.  
Response: return identifier, status, eligible/refused lines, next steps.

## Promotion/coupon validation

`POST /api/storefront/cart/coupons`

Request: cart token header and coupon code.  
Response: authoritative updated cart, applied promotion summary, or actionable rejection.

## Product facet expansion

`GET /api/storefront/products/facets` with current catalog query.

Response: available storage, RAM, color, rating, offer, and sales-sort facets with counts. Result filtering remains server-side.

## Reviews

`POST /api/storefront/customer/products/:productId/reviews`

Request: verified order-line reference, rating, title, body.  
Response: moderated review record and status.

## Payment session

`POST /api/storefront/customer/orders/:id/payment-session`

Request: configured payment method and return URL identifier.  
Response: public provider session data only; no secrets.
