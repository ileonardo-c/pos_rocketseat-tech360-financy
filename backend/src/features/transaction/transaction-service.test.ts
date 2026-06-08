import type { StorageService } from "@/features/storage/storage-service";
import { Prisma } from "@prisma/client";
import type { TransactionRepository } from "./transaction-repository";
import { TransactionService } from "./transaction-service";

process.env.AWS_S3_ENDPOINT_INTERNAL = "http://localhost:9000";
process.env.AWS_REGION = "us-east-1";
process.env.AWS_S3_BUCKET = "financy";
process.env.AWS_ACCESS_KEY_ID = "dev";
process.env.AWS_SECRET_ACCESS_KEY = "dev";
process.env.AWS_S3_FORCE_PATH_STYLE = "true";

type StoredTransaction = {
  id: string;
  userId: string;
  receiptKey: string | null;
  receiptUrl: string | null;
  [key: string]: unknown;
};

type RepositoryCall =
  | { method: "findByIdAndUser"; args: [string, string] }
  | { method: "update"; args: [string, unknown] }
  | { method: "deleteById"; args: [string] };

type StorageMock = {
  deletedKeys: string[];
  deleteError?: unknown;
  deleteObject: (key: string) => Promise<void>;
};

type TransactionUpdateInput = Parameters<TransactionService["update"]>[2];

class TransactionRepositoryFake {
  calls: RepositoryCall[] = [];
  data: StoredTransaction | null;
  updateError: unknown = null;
  deleteError: unknown = null;

  constructor(initial: StoredTransaction | null) {
    this.data = initial;
  }

  async findByIdAndUser(id: string, userId: string) {
    this.calls.push({ method: "findByIdAndUser", args: [id, userId] });
    if (!this.data || this.data.id !== id || this.data.userId !== userId) {
      return null;
    }

    return {
      id: this.data.id,
      userId: this.data.userId,
      receiptKey: this.data.receiptKey,
      receiptUrl: this.data.receiptUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "",
      description: null,
      amount: 0,
      type: "INCOME",
      date: new Date(),
      categoryId: "category-1",
      category: null,
    };
  }

  async update(id: string, payload: TransactionUpdateInput) {
    this.calls.push({ method: "update", args: [id, payload] });
    if (this.updateError) {
      throw this.updateError;
    }
    if (!this.data || this.data.id !== id) {
      throw this.createP2025();
    }

    this.data = {
      ...this.data,
      ...payload,
    };

    return {
      id: this.data.id,
      userId: this.data.userId,
      receiptKey: this.data.receiptKey,
      receiptUrl: this.data.receiptUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "",
      description: null,
      amount: 0,
      type: "INCOME",
      date: new Date(),
      categoryId: "category-1",
      category: null,
    };
  }

  async deleteById(id: string) {
    this.calls.push({ method: "deleteById", args: [id] });
    if (this.deleteError) {
      throw this.deleteError;
    }
    if (!this.data || this.data.id !== id) {
      throw this.createP2025();
    }

    const deleted = this.data;
    this.data = null;
    return {
      id: deleted.id,
      userId: deleted.userId,
      receiptKey: deleted.receiptKey,
      receiptUrl: deleted.receiptUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "",
      description: null,
      amount: 0,
      type: "INCOME",
      date: new Date(),
      categoryId: "category-1",
      category: null,
    };
  }

  private createP2025() {
    return new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "5.22.0",
    });
  }
}

const createStorageMock = (options: { deleteError?: unknown } = {}): StorageMock => {
  const storage: StorageMock = {
    deletedKeys: [],
    deleteError: options.deleteError,
    deleteObject: async (key: string) => {
      storage.deletedKeys.push(key);
      if (storage.deleteError) {
        throw storage.deleteError;
      }
    },
  };

  return storage;
};

const createContext = () =>
  ({ userId: "user-1" }) as unknown as Parameters<TransactionService["update"]>[0];

const withMutedWarn = async (callback: () => Promise<void>) => {
  const originalWarn = console.warn;
  const warnings: unknown[][] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    await callback();
  } finally {
    console.warn = originalWarn;
  }

  return warnings;
};

const createService = (repository: TransactionRepositoryFake, storage?: StorageMock) =>
  new TransactionService(
    repository as unknown as TransactionRepository,
    storage as StorageService | undefined,
  );

const tests: Array<[string, () => Promise<void>]> = [
  [
    "replaces receipt and cleans previous receipt key after DB update",
    async () => {
      const repository = new TransactionRepositoryFake({
        id: "tx-1",
        userId: "user-1",
        receiptKey: "users/user-1/receipts/old.png",
        receiptUrl: "https://storage.local/financy/users/user-1/receipts/old.png",
      });
      const storage = createStorageMock();
      const service = createService(repository, storage);

      const result = await service.update(createContext(), "tx-1", {
        receiptKey: "users/user-1/receipts/new.png",
      });

      if (repository.calls[0]?.method !== "findByIdAndUser") {
        throw new Error("Expected ownership check before updates");
      }
      if (storage.deletedKeys.length !== 1) {
        throw new Error("Expected old receipt cleanup");
      }
      if (storage.deletedKeys[0] !== "users/user-1/receipts/old.png") {
        throw new Error("Expected cleanup of previous receipt key");
      }
      if (!result.receiptKey || !result.receiptKey.includes("new.png")) {
        throw new Error("Expected updated transaction with new receipt");
      }
    },
  ],
  [
    "does not clean receipt when DB update fails",
    async () => {
      const repository = new TransactionRepositoryFake({
        id: "tx-1",
        userId: "user-1",
        receiptKey: "users/user-1/receipts/old.png",
        receiptUrl: "https://storage.local/financy/users/user-1/receipts/old.png",
      });
      repository.updateError = new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "5.22.0",
      });
      const storage = createStorageMock();
      const service = createService(repository, storage);

      try {
        await service.update(createContext(), "tx-1", {
          receiptKey: "users/user-1/receipts/new.png",
        });
      } catch {
        if (storage.deletedKeys.length !== 0) {
          throw new Error("Cleanup must not run when DB update fails");
        }
        return;
      }

      throw new Error("Expected update to fail");
    },
  ],
  [
    "keeps DB state when receipt cleanup fails after update",
    async () => {
      const repository = new TransactionRepositoryFake({
        id: "tx-1",
        userId: "user-1",
        receiptKey: "users/user-1/receipts/old.png",
        receiptUrl: "https://storage.local/financy/users/user-1/receipts/old.png",
      });
      const storage = createStorageMock({ deleteError: new Error("S3 unavailable") });
      const service = createService(repository, storage);

      const warnings = await withMutedWarn(async () => {
        const result = await service.update(createContext(), "tx-1", {
          receiptKey: "users/user-1/receipts/new.png",
        });
        if (!result.receiptKey) {
          throw new Error("Expected update response with receipt");
        }
      });

      if (storage.deletedKeys.length !== 1) {
        throw new Error("Expected cleanup attempt after DB update");
      }
      if (repository.data?.receiptKey !== "users/user-1/receipts/new.png") {
        throw new Error("Database must keep persisted new receipt despite cleanup failure");
      }
      if (warnings.length !== 1 || warnings[0]?.[0] !== "Receipt cleanup failed") {
        throw new Error("Expected cleanup failure to be logged in English");
      }
    },
  ],
  [
    "does not allow receipt key from another user",
    async () => {
      const repository = new TransactionRepositoryFake({
        id: "tx-1",
        userId: "user-1",
        receiptKey: "users/user-1/receipts/old.png",
        receiptUrl: "https://storage.local/financy/users/user-1/receipts/old.png",
      });
      const storage = createStorageMock();
      const service = createService(repository, storage);

      await service
        .update(createContext(), "tx-1", {
          receiptKey: "users/user-2/receipts/external.png",
        })
        .then(() => {
          throw new Error("Expected invalid receipt ownership to fail");
        })
        .catch(() => {
          if (storage.deletedKeys.length !== 0) {
            throw new Error("Ownership validation failed before cleanup");
          }
        });
    },
  ],
  [
    "deletes previous receipt after successful transaction deletion",
    async () => {
      const repository = new TransactionRepositoryFake({
        id: "tx-1",
        userId: "user-1",
        receiptKey: "users/user-1/receipts/old.png",
        receiptUrl: "https://storage.local/financy/users/user-1/receipts/old.png",
      });
      const storage = createStorageMock();
      const service = createService(repository, storage);

      const result = await service.delete(createContext(), "tx-1");
      if (!result) {
        throw new Error("Expected transaction deletion to succeed");
      }

      if (storage.deletedKeys.length !== 1) {
        throw new Error("Expected receipt cleanup after delete");
      }
      if (storage.deletedKeys[0] !== "users/user-1/receipts/old.png") {
        throw new Error("Expected cleanup of deleted transaction receipt");
      }
    },
  ],
  [
    "does not call delete when transaction deletion fails before cleanup",
    async () => {
      const repository = new TransactionRepositoryFake({
        id: "tx-1",
        userId: "user-1",
        receiptKey: "users/user-1/receipts/old.png",
        receiptUrl: "https://storage.local/financy/users/user-1/receipts/old.png",
      });
      repository.deleteError = new Error("Delete constraint");
      const storage = createStorageMock();
      const service = createService(repository, storage);

      await service
        .delete(createContext(), "tx-1")
        .then(() => {
          throw new Error("Expected delete to fail");
        })
        .catch(() => {
          if (storage.deletedKeys.length !== 0) {
            throw new Error("Cleanup must not run when DB delete fails");
          }
        });
    },
  ],
  [
    "keeps success when receipt cleanup fails after delete",
    async () => {
      const repository = new TransactionRepositoryFake({
        id: "tx-1",
        userId: "user-1",
        receiptKey: "users/user-1/receipts/old.png",
        receiptUrl: "https://storage.local/financy/users/user-1/receipts/old.png",
      });
      const storage = createStorageMock({ deleteError: new Error("S3 unavailable") });
      const service = createService(repository, storage);

      const warnings = await withMutedWarn(async () => {
        const result = await service.delete(createContext(), "tx-1");
        if (!result) {
          throw new Error("Expected delete response true");
        }
      });

      if (storage.deletedKeys.length !== 1) {
        throw new Error("Expected cleanup attempt after successful delete");
      }
      if (repository.data !== null) {
        throw new Error("Database should delete record regardless of cleanup failure");
      }
      if (warnings.length !== 1 || warnings[0]?.[0] !== "Receipt cleanup failed") {
        throw new Error("Expected cleanup failure to be logged in English");
      }
    },
  ],
];

const run = async () => {
  for (const [name, test] of tests) {
    await test();
    console.log(`transaction-service: ${name}`);
  }

  console.log("transaction-service: all scenarios passed");
};

run().catch((error) => {
  console.error(`transaction-service failed: ${error.message}`);
  process.exit(1);
});
