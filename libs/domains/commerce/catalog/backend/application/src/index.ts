import type { CommerceProduct, CommerceProductInput, CommerceProductQuery } from '@erp/commerce-catalog-contracts';

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ProductRepository {
  list(companyId: string, query: CommerceProductQuery): Promise<Page<CommerceProduct>>;
  findById(companyId: string, id: string): Promise<CommerceProduct | null>;
  create(companyId: string, input: CommerceProductInput): Promise<CommerceProduct>;
  update(companyId: string, id: string, input: Partial<CommerceProductInput>): Promise<CommerceProduct | null>;
}

export class CatalogApplication {
  constructor(private readonly products: ProductRepository) {}

  listProducts(companyId: string, query: CommerceProductQuery) {
    return this.products.list(companyId, query);
  }

  getProduct(companyId: string, id: string) {
    return this.products.findById(companyId, id);
  }

  createProduct(companyId: string, input: CommerceProductInput) {
    return this.products.create(companyId, input);
  }

  updateProduct(companyId: string, id: string, input: Partial<CommerceProductInput>) {
    return this.products.update(companyId, id, input);
  }
}
