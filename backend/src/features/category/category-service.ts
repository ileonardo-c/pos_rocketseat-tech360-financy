import { CategoryRepository } from "./category-repository";

export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  create(userId: string, name: string) {
    return this.repository.create(userId, name);
  }

  list(userId: string) {
    return this.repository.findManyByUser(userId);
  }

  async update(userId: string, id: string, name: string) {
    const result = await this.repository.update(id, userId, name);
    if (result.count === 0) {
      throw new Error("Categoria não encontrada");
    }

    return this.repository.findByUser(id, userId);
  }

  async remove(userId: string, id: string) {
    const result = await this.repository.remove(id, userId);
    return result.count > 0;
  }
}
