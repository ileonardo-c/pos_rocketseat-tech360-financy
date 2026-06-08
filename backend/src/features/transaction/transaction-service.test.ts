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
process.env.AWS_S3_URL_EXPIRES_IN = "900";

type StoredTransaction = {
  id: string;
  userId: string;
  receiptKey: string | null;
  receiptUrl: string | null;
  [key: string]: unknown;
};

type RepositoryCall =
  | { method: "findByIdAndUser"; args: [string, string] }
  | { method: "findCategoryByIdAndUser"; args: [string, string] }
  | { method: "create"; args: [string, unknown] }
  | { method: "update"; args: [string, unknown] }
  | { method: "deleteById"; args: [string] };

type StorageMock = {
  deletedKeys: string[];
  validatedKeys: string[];
  deleteError?: unknown;
  validationError?: unknown;
  deleteObject: (key: string) => Promise<void>;
  validateReceiptUpload: (key: string) => Promise<void>;
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

  async findCategoryByIdAndUser(id: string, userId: string) {
    this.calls.push({ method: "findCategoryByIdAndUser", args: [id, userId] });
    if (id !== "category-1" || userId !== "user-1") {
      return null;
    }

    return {
      id,
      userId,
      name: "Category",
      icon: "utensils",
      color: "blue",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async create(userId: string, payload: unknown) {
    this.calls.push({ method: "create", args: [userId, payload] });
    const receiptKey =
      typeof payload === "object" && payload !== null && "receiptKey" in payload
        ? ((payload as { receiptKey?: string | null }).receiptKey ?? null)
        : null;
    const receiptUrl =
      typeof payload === "object" && payload !== null && "receiptUrl" in payload
        ? ((payload as { receiptUrl?: string | null }).receiptUrl ?? null)
        : null;

    this.data = {
      id: "tx-created",
      userId,
      receiptKey,
      receiptUrl,
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
    validatedKeys: [],
    deleteError: options.deleteError,
    deleteObject: async (key: string) => {
      storage.deletedKeys.push(key);
      if (storage.deleteError) {
        throw storage.deleteError;
      }
    },
    validateReceiptUpload: async (key: string) => {
      storage.validatedKeys.push(key);
      if (storage.validationError) {
        throw storage.validationError;
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
    "creates transaction with receipt after upload validation",
    async () => {
      const repository = new TransactionRepositoryFake(null);
      const storage = createStorageMock();
      const service = createService(repository, storage);

      const result = await service.create(createContext(), {
        title: "Receipt transaction",
        amount: 10,
        type: "EXPENSE",
        date: "2026-06-01",
        categoryId: "category-1",
        receiptKey: "users/user-1/receipts/new.png",
      });

      if (storage.validatedKeys[0] !== "users/user-1/receipts/new.png") {
        throw new Error("Expected receipt upload validation before creation");
      }
      if (!repository.calls.some((call) => call.method === "create")) {
        throw new Error("Expected transaction creation after receipt validation");
      }
      if (result.receiptKey !== "users/user-1/receipts/new.png") {
        throw new Error("Expected created transaction with receipt key");
      }
    },
  ],
  [
    "rejects avatar key as receipt before creation",
    async () => {
      const repository = new TransactionRepositoryFake(null);
      const storage = createStorageMock();
      const service = createService(repository, storage);

      await service
        .create(createContext(), {
          title: "Invalid receipt transaction",
          amount: 10,
          type: "EXPENSE",
          date: "2026-06-01",
          categoryId: "category-1",
          receiptKey: "users/user-1/avatars/avatar.png",
        })
        .then(() => {
          throw new Error("Expected avatar key used as receipt to fail");
        })
        .catch((error) => {
          if (error.message !== "Invalid receipt for this user") {
            throw error;
          }
          if (storage.validatedKeys.length !== 0) {
            throw new Error("Invalid receipt namespace must not validate upload object");
          }
          if (repository.calls.some((call) => call.method === "create")) {
            throw new Error("Invalid receipt namespace must not create transaction");
          }
        });
    },
  ],
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
    "rejects avatar key as receipt before database update",
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
          receiptKey: "users/user-1/avatars/avatar.png",
        })
        .then(() => {
          throw new Error("Expected avatar key used as receipt to fail");
        })
        .catch((error) => {
          if (error.message !== "Invalid receipt for this user") {
            throw error;
          }
          if (storage.validatedKeys.length !== 0) {
            throw new Error("Invalid receipt namespace must not validate upload object");
          }
          if (repository.data?.receiptKey !== "users/user-1/receipts/old.png") {
            throw new Error("Invalid receipt namespace must not update database");
          }
        });
    },
  ],
  [
    "rejects oversized receipt before database update",
    async () => {
      const repository = new TransactionRepositoryFake({
        id: "tx-1",
        userId: "user-1",
        receiptKey: "users/user-1/receipts/old.png",
        receiptUrl: "https://storage.local/financy/users/user-1/receipts/old.png",
      });
      const storage = createStorageMock();
      storage.validationError = new Error("Invalid uploaded object size");
      const service = createService(repository, storage);

      await service
        .update(createContext(), "tx-1", {
          receiptKey: "users/user-1/receipts/new.png",
        })
        .then(() => {
          throw new Error("Expected oversized receipt to fail");
        })
        .catch((error) => {
          if (error.message !== "Invalid uploaded object size") {
            throw error;
          }
          if (repository.data?.receiptKey !== "users/user-1/receipts/old.png") {
            throw new Error("Invalid receipt must not update the database");
          }
          if (storage.deletedKeys.length !== 0) {
            throw new Error("Old receipt must not be cleaned after invalid upload");
          }
        });
    },
  ],
  [
    "rejects invalid receipt content type before database update",
    async () => {
      const repository = new TransactionRepositoryFake({
        id: "tx-1",
        userId: "user-1",
        receiptKey: "users/user-1/receipts/old.png",
        receiptUrl: "https://storage.local/financy/users/user-1/receipts/old.png",
      });
      const storage = createStorageMock();
      storage.validationError = new Error("Invalid uploaded object content type");
      const service = createService(repository, storage);

      await service
        .update(createContext(), "tx-1", {
          receiptKey: "users/user-1/receipts/new.png",
        })
        .then(() => {
          throw new Error("Expected invalid receipt content type to fail");
        })
        .catch((error) => {
          if (error.message !== "Invalid uploaded object content type") {
            throw error;
          }
          if (repository.data?.receiptKey !== "users/user-1/receipts/old.png") {
            throw new Error("Invalid receipt must not update the database");
          }
          if (storage.deletedKeys.length !== 0) {
            throw new Error("Old receipt must not be cleaned after invalid upload");
          }
        });
    },
  ],
  [
    "does not clean previous key outside receipt namespace after update",
    async () => {
      const repository = new TransactionRepositoryFake({
        id: "tx-1",
        userId: "user-1",
        receiptKey: "users/user-1/avatars/avatar.png",
        receiptUrl: "https://storage.local/financy/users/user-1/avatars/avatar.png",
      });
      const storage = createStorageMock();
      const service = createService(repository, storage);

      await service.update(createContext(), "tx-1", {
        receiptKey: "users/user-1/receipts/new.png",
      });

      if (storage.deletedKeys.length !== 0) {
        throw new Error("Cleanup must not delete objects outside receipt namespace");
      }
      if (repository.data?.receiptKey !== "users/user-1/receipts/new.png") {
        throw new Error("Expected database update to keep new receipt");
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
    "does not clean previous key outside receipt namespace after delete",
    async () => {
      const repository = new TransactionRepositoryFake({
        id: "tx-1",
        userId: "user-1",
        receiptKey: "users/user-1/avatars/avatar.png",
        receiptUrl: "https://storage.local/financy/users/user-1/avatars/avatar.png",
      });
      const storage = createStorageMock();
      const service = createService(repository, storage);

      const result = await service.delete(createContext(), "tx-1");
      if (!result) {
        throw new Error("Expected transaction deletion to succeed");
      }

      if (storage.deletedKeys.length !== 0) {
        throw new Error("Cleanup must not delete objects outside receipt namespace");
      }
      if (repository.data !== null) {
        throw new Error("Expected transaction deletion in database");
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
