import { AppError } from "@/lib/errors";
import { Prisma, type User } from "@prisma/client";
import type { AuthRepository } from "./auth-repository";
import { AuthService } from "./auth-service";

type StoredUser = User;

type StorageMock = {
  deletedKeys: string[];
  validationError?: unknown;
  publicUrlForKey: (key: string) => string;
  deleteObject: (key: string) => Promise<void>;
  validateProfileAvatarUpload: (key: string) => Promise<void>;
};

const now = new Date("2026-01-01T00:00:00.000Z");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const buildUser = (overrides: Partial<StoredUser> = {}): StoredUser => ({
  id: "user-1",
  name: "Avatar User",
  email: "avatar@financy.local",
  password: "hashed-password",
  avatarKey: "users/user-1/avatars/old-avatar.png",
  avatarUrl: "http://storage.local/financy/users/user-1/avatars/old-avatar.png",
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const createP2025 = () =>
  new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "5.22.0",
  });

class AuthRepositoryFake {
  user: StoredUser | null = buildUser();
  updateCalls: Array<{
    id: string;
    data: { name?: string; email?: string; avatarKey?: string | null; avatarUrl?: string | null };
  }> = [];
  updateError: unknown = null;

  async findById(id: string) {
    return this.user?.id === id ? this.user : null;
  }

  async updateUser(
    id: string,
    data: { name?: string; email?: string; avatarKey?: string | null; avatarUrl?: string | null },
  ) {
    this.updateCalls.push({ id, data });
    if (this.updateError) {
      throw this.updateError;
    }
    if (!this.user || this.user.id !== id) {
      throw createP2025();
    }

    this.user = {
      ...this.user,
      ...data,
      updatedAt: new Date(now.getTime() + this.updateCalls.length),
    };
    return this.user;
  }
}

const createStorageMock = (options: { deleteError?: unknown } = {}): StorageMock => ({
  deletedKeys: [],
  publicUrlForKey: (key: string) => `http://storage.local/financy/${key}`,
  deleteObject: async function deleteObject(this: StorageMock, key: string) {
    this.deletedKeys.push(key);
    if (options.deleteError) {
      throw options.deleteError;
    }
  },
  validateProfileAvatarUpload: async function validateProfileAvatarUpload(
    this: StorageMock,
    _key: string,
  ) {
    if (this.validationError) {
      throw this.validationError;
    }
  },
});

const createService = (repository: AuthRepositoryFake) =>
  new AuthService(repository as unknown as AuthRepository);

const createContext = () =>
  ({ userId: "user-1" }) as unknown as Parameters<AuthService["removeProfileAvatar"]>[0];

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

const expectUserNotFound = async (callback: () => Promise<unknown>) => {
  try {
    await callback();
  } catch (error) {
    assert(error instanceof AppError, "Expected AppError for missing user");
    assert(error.statusCode === 404, `Expected status 404, got ${error.statusCode}`);
    assert(error.code === "AUTH_USER_NOT_FOUND", `Expected AUTH_USER_NOT_FOUND, got ${error.code}`);
    return;
  }

  throw new Error("Expected operation to fail with user not found");
};

const tests: Array<[string, () => Promise<void>]> = [
  [
    "removes avatar after database reference is cleared",
    async () => {
      const repository = new AuthRepositoryFake();
      const storage = createStorageMock();
      const service = createService(repository);

      const result = await service.removeProfileAvatar(
        createContext(),
        storage as unknown as Parameters<AuthService["removeProfileAvatar"]>[1],
      );

      assert(repository.updateCalls.length === 1, "Expected one user update");
      assert(repository.updateCalls[0]?.data.avatarKey === null, "Expected avatarKey cleanup");
      assert(repository.updateCalls[0]?.data.avatarUrl === null, "Expected avatarUrl cleanup");
      assert(storage.deletedKeys.length === 1, "Expected old avatar cleanup after update");
      assert(
        storage.deletedKeys[0] === "users/user-1/avatars/old-avatar.png",
        "Expected cleanup of previous avatar key",
      );
      assert(result.avatarUrl === null, "Returned user should not expose avatar URL");
      assert(repository.user?.avatarKey === null, "Stored user should not keep avatar key");
      assert(repository.user?.avatarUrl === null, "Stored user should not keep avatar URL");
    },
  ],
  [
    "does not delete avatar when database cleanup fails",
    async () => {
      const repository = new AuthRepositoryFake();
      repository.updateError = createP2025();
      const storage = createStorageMock();
      const service = createService(repository);

      await expectUserNotFound(() =>
        service.removeProfileAvatar(
          createContext(),
          storage as unknown as Parameters<AuthService["removeProfileAvatar"]>[1],
        ),
      );

      assert(storage.deletedKeys.length === 0, "Storage cleanup must not run after DB failure");
      assert(
        repository.user?.avatarKey === "users/user-1/avatars/old-avatar.png",
        "Old avatar key must remain persisted after DB failure",
      );
    },
  ],
  [
    "keeps database cleanup when avatar storage cleanup fails",
    async () => {
      const repository = new AuthRepositoryFake();
      const storage = createStorageMock({ deleteError: new Error("S3 unavailable") });
      const service = createService(repository);

      const warnings = await withMutedWarn(async () => {
        const result = await service.removeProfileAvatar(
          createContext(),
          storage as unknown as Parameters<AuthService["removeProfileAvatar"]>[1],
        );
        assert(result.avatarUrl === null, "Avatar removal should still return cleaned user");
      });

      assert(storage.deletedKeys.length === 1, "Expected one cleanup attempt");
      assert(repository.user?.avatarKey === null, "DB cleanup must remain committed");
      assert(repository.user?.avatarUrl === null, "DB avatar URL cleanup must remain committed");
      assert(warnings.length === 1, "Cleanup failure should be logged once");
      assert(warnings[0]?.[0] === "Avatar cleanup failed", "Cleanup warning must be in English");
    },
  ],
  [
    "replaces avatar before deleting previous avatar object",
    async () => {
      const repository = new AuthRepositoryFake();
      const storage = createStorageMock();
      const service = createService(repository);
      const newAvatarKey = "users/user-1/avatars/new-avatar.png";

      const result = await service.updateProfileAvatar(
        createContext(),
        { avatarKey: newAvatarKey },
        storage as unknown as Parameters<AuthService["updateProfileAvatar"]>[2],
      );

      assert(repository.updateCalls.length === 1, "Expected one user update");
      assert(repository.updateCalls[0]?.data.avatarKey === newAvatarKey, "Expected new avatar key");
      assert(storage.deletedKeys.length === 1, "Expected previous avatar cleanup");
      assert(
        storage.deletedKeys[0] === "users/user-1/avatars/old-avatar.png",
        "Expected cleanup of old avatar only",
      );
      assert(result.avatarUrl === `http://storage.local/financy/${newAvatarKey}`, "URL mismatch");
      assert(repository.user?.avatarKey === newAvatarKey, "Stored user should point to new avatar");
    },
  ],
  [
    "rejects oversized avatar before database update",
    async () => {
      const repository = new AuthRepositoryFake();
      const storage = createStorageMock();
      storage.validationError = new AppError(
        "Invalid uploaded object size",
        422,
        "AUTH_INVALID_AVATAR_SIZE",
      );
      const service = createService(repository);

      try {
        await service.updateProfileAvatar(
          createContext(),
          { avatarKey: "users/user-1/avatars/new-avatar.png" },
          storage as unknown as Parameters<AuthService["updateProfileAvatar"]>[2],
        );
      } catch (error) {
        assert(error instanceof AppError, "Expected AppError for invalid avatar size");
        assert(error.code === "AUTH_INVALID_AVATAR_SIZE", "Expected avatar size error code");
        assert(repository.updateCalls.length === 0, "Invalid avatar must not update the user");
        assert(storage.deletedKeys.length === 0, "Old avatar must not be deleted");
        return;
      }

      throw new Error("Expected oversized avatar to fail");
    },
  ],
  [
    "rejects invalid avatar content type before database update",
    async () => {
      const repository = new AuthRepositoryFake();
      const storage = createStorageMock();
      storage.validationError = new AppError(
        "Invalid uploaded object content type",
        422,
        "AUTH_INVALID_AVATAR_CONTENT_TYPE",
      );
      const service = createService(repository);

      try {
        await service.updateProfileAvatar(
          createContext(),
          { avatarKey: "users/user-1/avatars/new-avatar.png" },
          storage as unknown as Parameters<AuthService["updateProfileAvatar"]>[2],
        );
      } catch (error) {
        assert(error instanceof AppError, "Expected AppError for invalid avatar content type");
        assert(
          error.code === "AUTH_INVALID_AVATAR_CONTENT_TYPE",
          "Expected avatar content type error code",
        );
        assert(repository.updateCalls.length === 0, "Invalid avatar must not update the user");
        assert(storage.deletedKeys.length === 0, "Old avatar must not be deleted");
        return;
      }

      throw new Error("Expected invalid avatar content type to fail");
    },
  ],
  [
    "keeps new avatar when previous avatar cleanup fails",
    async () => {
      const repository = new AuthRepositoryFake();
      const storage = createStorageMock({ deleteError: new Error("S3 unavailable") });
      const service = createService(repository);
      const newAvatarKey = "users/user-1/avatars/new-avatar.png";

      const warnings = await withMutedWarn(async () => {
        const result = await service.updateProfileAvatar(
          createContext(),
          { avatarKey: newAvatarKey },
          storage as unknown as Parameters<AuthService["updateProfileAvatar"]>[2],
        );
        assert(
          result.avatarUrl === `http://storage.local/financy/${newAvatarKey}`,
          "Avatar replacement should still return new URL",
        );
      });

      assert(storage.deletedKeys.length === 1, "Expected cleanup attempt for old avatar");
      assert(repository.user?.avatarKey === newAvatarKey, "New avatar key must remain persisted");
      assert(
        repository.user?.avatarUrl === `http://storage.local/financy/${newAvatarKey}`,
        "New avatar URL must remain persisted",
      );
      assert(warnings.length === 1, "Cleanup failure should be logged once");
    },
  ],
  [
    "does not delete previous avatar when replacement database update fails",
    async () => {
      const repository = new AuthRepositoryFake();
      repository.updateError = createP2025();
      const storage = createStorageMock();
      const service = createService(repository);

      await expectUserNotFound(() =>
        service.updateProfileAvatar(
          createContext(),
          { avatarKey: "users/user-1/avatars/new-avatar.png" },
          storage as unknown as Parameters<AuthService["updateProfileAvatar"]>[2],
        ),
      );

      assert(storage.deletedKeys.length === 0, "Old avatar must not be deleted after DB failure");
      assert(
        repository.user?.avatarKey === "users/user-1/avatars/old-avatar.png",
        "Old avatar key must remain persisted",
      );
    },
  ],
  [
    "rejects avatar replacement outside the authenticated user namespace",
    async () => {
      const repository = new AuthRepositoryFake();
      const storage = createStorageMock();
      const service = createService(repository);

      try {
        await service.updateProfileAvatar(
          createContext(),
          { avatarKey: "users/user-2/avatars/new-avatar.png" },
          storage as unknown as Parameters<AuthService["updateProfileAvatar"]>[2],
        );
      } catch (error) {
        assert(error instanceof AppError, "Expected AppError for invalid avatar ownership");
        assert(error.statusCode === 422, `Expected status 422, got ${error.statusCode}`);
        assert(
          error.code === "AUTH_INVALID_AVATAR_KEY",
          `Expected AUTH_INVALID_AVATAR_KEY, got ${error.code}`,
        );
        assert(repository.updateCalls.length === 0, "Invalid avatar must not update the user");
        assert(storage.deletedKeys.length === 0, "Invalid avatar must not delete storage objects");
        return;
      }

      throw new Error("Expected invalid avatar ownership to fail");
    },
  ],
];

const run = async () => {
  for (const [name, test] of tests) {
    await test();
    console.log(`auth-service: ${name}`);
  }

  console.log("auth-service: all scenarios passed");
};

run().catch((error) => {
  console.error(`auth-service failed: ${error.message}`);
  process.exit(1);
});
