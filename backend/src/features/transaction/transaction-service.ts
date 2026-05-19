import { TransactionType } from "@prisma/client";
import { TransactionRepository } from "./transaction-repository";

export class TransactionService {
  constructor(private readonly repository: TransactionRepository) {}

  create(
    userId: string,
    input: {
      amount: number;
      description?: string | null;
      type: TransactionType;
      title: string;
      categoryId: string;
      date?: string | null;
    },
  ) {
    return this.repository.create(userId, input);
  }

  list(userId: string) {
    return this.repository.listByUser(userId);
  }

  async update(
    userId: string,
    id: string,
    input: {
      amount?: number;
      description?: string | null;
      type?: TransactionType;
      title?: string;
      categoryId?: string;
      date?: string | null;
    },
  ) {
    const result = await this.repository.update(id, userId, input);
    if (result.count === 0) {
      throw new Error("Transação não encontrada");
    }

    return this.repository.findByUser(id, userId);
  }

  async remove(userId: string, id: string) {
    const result = await this.repository.remove(id, userId);
    return result.count > 0;
  }
}
