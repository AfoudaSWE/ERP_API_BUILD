import { describe, expect, it, vi } from 'vitest';
import { CatalogApplication, type ProductRepository } from './index.js';

describe('CatalogApplication', () => {
  it('always passes company scope to the repository', async () => {
    const repository = { list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 }) } as unknown as ProductRepository;
    const application = new CatalogApplication(repository);
    await application.listProducts('company-1', { page: 1, pageSize: 25, search: '' });
    expect(repository.list).toHaveBeenCalledWith('company-1', expect.objectContaining({ page: 1 }));
  });
});
