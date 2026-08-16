import type { QueryResultRow } from 'pg';
import { query } from '../../db/client.js';

export interface PublicProductRow extends QueryResultRow {
  id:string;slug:string;sku:string;name:string;name_ar:string;description:string;description_ar:string;category_id:string|null;category_name:string|null;category_slug:string|null;brand:string|null;
  selling_price:string;compare_at_price:string|null;currency:string;tax_rate:string;total_stock:string;available_stock:string;reorder_level:string;type:string;published_at:string;seo_title:string|null;seo_description:string|null;
  media_id:string|null;media_url:string|null;thumbnail_url:string|null;media_alt:string|null;media_width:number|null;media_height:number|null;rating:string|null;review_count:string;has_variants:boolean;
}
const select=`SELECT p.id,p.slug,p.sku,p.name,p.name_ar,p.description,p.description_ar,p.category_id,c.name category_name,c.slug category_slug,p.brand,
 p.selling_price,p.compare_at_price,s.currency,p.tax_rate,p.total_stock,COALESCE(inv.available_stock,p.total_stock) available_stock,p.reorder_level,p.type,p.published_at,p.seo_title,p.seo_description,
 pm.id media_id,pm.url media_url,pm.thumbnail_url,pm.alt_text media_alt,pm.width media_width,pm.height media_height,
 rv.rating,COALESCE(rv.review_count,'0') review_count,EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.company_id=p.company_id AND v.is_active=true) has_variants
 FROM products p JOIN storefront_settings s ON s.company_id=p.company_id LEFT JOIN categories c ON c.id=p.category_id AND c.company_id=p.company_id
 LEFT JOIN LATERAL(SELECT id,url,thumbnail_url,alt_text,width,height FROM product_media WHERE company_id=p.company_id AND product_id=p.id AND media_type='image' ORDER BY position,id LIMIT 1)pm ON true
 LEFT JOIN LATERAL(SELECT avg(rating)::numeric(3,2) rating,count(*)::text review_count FROM product_reviews WHERE company_id=p.company_id AND product_id=p.id AND status='approved')rv ON true
 LEFT JOIN LATERAL(SELECT sum(available) available_stock FROM inventory_balances WHERE company_id=p.company_id AND product_id=p.id)inv ON true`;
export const publicWhere=`p.company_id=$1 AND p.is_active=true AND p.storefront_visible=true AND p.commerce_status='active' AND p.published_at IS NOT NULL AND p.published_at<=now()`;

function availability(row:PublicProductRow){const stock=Number(row.available_stock);if(row.type==='service')return'in_stock' as const;if(stock<=0)return'out_of_stock' as const;if(stock<=Number(row.reorder_level))return'low_stock' as const;return'in_stock' as const;}
export function mapPublicProduct(row:PublicProductRow){
  const price=Number(row.selling_price),original=row.compare_at_price===null?null:Number(row.compare_at_price);
  return{id:row.id,slug:row.slug,sku:row.sku,name:row.name,nameAr:row.name_ar,description:row.description,descriptionAr:row.description_ar,categoryId:row.category_id,categoryName:row.category_name,categorySlug:row.category_slug,brand:row.brand,price,originalPrice:original,discountPercent:original&&original>price?Math.round((1-price/original)*100):null,currency:row.currency,taxRate:Number(row.tax_rate),stockQuantity:Number(row.available_stock),availability:availability(row),rating:row.rating===null?null:Number(row.rating),reviewCount:Number(row.review_count),primaryImage:row.media_id?{id:row.media_id,url:row.media_url!,thumbnailUrl:row.thumbnail_url,altText:row.media_alt||row.name,mediaType:'image' as const,width:row.media_width,height:row.media_height}:null,hasVariants:row.has_variants,publishedAt:row.published_at,seoTitle:row.seo_title,seoDescription:row.seo_description};
}

export interface PublicProductFilters{page:number;pageSize:number;search?:string;category?:string;brand?:string;minPrice?:number;maxPrice?:number;availability?:string;sort?:string;ids?:string[];excludeId?:string}
export async function listPublicProducts(companyId:string,input:PublicProductFilters){
  const values:unknown[]=[companyId];const filters=[publicWhere];
  if(input.search){values.push(`%${input.search}%`);filters.push(`(p.name ILIKE $${values.length} OR p.name_ar ILIKE $${values.length} OR p.sku ILIKE $${values.length} OR p.brand ILIKE $${values.length})`);}
  if(input.category){values.push(input.category);filters.push(`(c.slug=$${values.length} OR c.id::text=$${values.length})`);}
  if(input.brand){values.push(input.brand);filters.push(`lower(p.brand)=lower($${values.length})`);}
  if(input.minPrice!==undefined){values.push(input.minPrice);filters.push(`p.selling_price>=$${values.length}`);}if(input.maxPrice!==undefined){values.push(input.maxPrice);filters.push(`p.selling_price<=$${values.length}`);}
  if(input.availability==='in_stock')filters.push(`(p.type='service' OR COALESCE((SELECT sum(b.available) FROM inventory_balances b WHERE b.company_id=p.company_id AND b.product_id=p.id),p.total_stock)>0)`);if(input.availability==='out_of_stock')filters.push(`p.type<>'service' AND COALESCE((SELECT sum(b.available) FROM inventory_balances b WHERE b.company_id=p.company_id AND b.product_id=p.id),p.total_stock)<=0`);
  if(input.ids?.length){values.push(input.ids);filters.push(`p.id=ANY($${values.length}::uuid[])`);}if(input.excludeId){values.push(input.excludeId);filters.push(`p.id<>$${values.length}`);}
  const where=filters.join(' AND ');const count=await query<{count:string}>(`SELECT count(*) FROM products p LEFT JOIN categories c ON c.id=p.category_id JOIN storefront_settings s ON s.company_id=p.company_id WHERE ${where}`,values);
  const order:Record<string,string>={newest:'p.published_at DESC','price-asc':'p.selling_price ASC','price-desc':'p.selling_price DESC',discount:'(COALESCE(p.compare_at_price,p.selling_price)-p.selling_price) DESC',relevance:'p.updated_at DESC'};
  values.push(input.pageSize,(input.page-1)*input.pageSize);const rows=await query<PublicProductRow>(`${select} WHERE ${where} ORDER BY ${order[input.sort||'relevance']||order.relevance} LIMIT $${values.length-1} OFFSET $${values.length}`,values);
  return{products:rows.rows.map(mapPublicProduct),total:Number(count.rows[0].count)};
}
export async function getPublicProductRow(companyId:string,slug:string){return(await query<PublicProductRow>(`${select} WHERE ${publicWhere} AND p.slug=$2`,[companyId,slug])).rows[0]??null;}
