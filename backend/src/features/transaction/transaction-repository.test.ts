import type { Prisma, PrismaClient } from "@prisma/client";
import { TransactionRepository } from "./transaction-repository";

type FindManyInput = Parameters<NonNullable<Prisma.TransactionDelegate["findMany"]>>[0];

type FindManyCall = (FindManyInput | undefined) & {
  where?: unknown;
  orderBy?: unknown;
  skip?: unknown;
  take?: unknown;
  include?: unknown;
};

type FindManyResult = {
  id: string;
  title: string;
  date: Date;
  amount: number;
};

type PrismaFake = {
  transaction: {
    findMany: (args?: FindManyInput) => Promise<FindManyResult[]>;
    findFirst: () => Promise<null>;
    findUnique: () => Promise<null>;
    update: () => Promise<FindManyResult | null>;
    delete: () => Promise<FindManyResult | null>;
    create: () => Promise<FindManyResult>;
    count: () => Promise<number>;
    groupBy: () => Promise<unknown[]>;
    createMany: () => Promise<unknown>;
  };
};

const createFindManyRepository = () => {
  const calls: FindManyCall[] = [];

  const prisma = {
    transaction: {
      findMany: async (args?: FindManyInput) => {
        calls.push(args ?? {});
        return [];
      },
      findFirst: async () => null,
      findUnique: async () => null,
      update: async () => null,
      delete: async () => null,
      create: async () => ({
        id: "",
        title: "",
        date: new Date(),
        amount: 0,
      }),
      count: async () => 0,
      groupBy: async () => [],
      createMany: async () => null,
    },
  } as unknown as PrismaFake;

  return { prisma, calls };
};

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertDeepEqual = <T>(actual: T, expected: T, message: string) => {
  const normalized = JSON.stringify(actual);
  const expectedValue = JSON.stringify(expected);
  if (normalized !== expectedValue) {
    throw new Error(`${message}. Expected ${expectedValue}, got ${normalized}`);
  }
};

const baseOptions = {
  query: undefined,
  type: undefined,
  categoryId: undefined,
  from: undefined,
  to: undefined,
};

const tests: Array<[string, () => Promise<void>]> = [
  [
    "uses stable ordering for DATE listing",
    async () => {
      const { prisma, calls } = createFindManyRepository();
      const repository = new TransactionRepository(prisma as unknown as PrismaClient);

      await repository.findListByUser("user-1", {
        ...baseOptions,
        sortField: "DATE",
        sortDirection: "DESC",
        page: 2,
        perPage: 10,
      });

      const lastCall = calls.at(-1);
      assert(!!lastCall, "findMany should be called once");
      assert(!!lastCall?.orderBy, "findListByUser should set orderBy");
      assertDeepEqual(
        lastCall?.orderBy,
        [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        "DATE sort must include createdAt and id as stable tie-breakers",
      );
    },
  ],
  [
    "uses stable ordering for AMOUNT listing",
    async () => {
      const { prisma, calls } = createFindManyRepository();
      const repository = new TransactionRepository(prisma as unknown as PrismaClient);

      await repository.findListByUser("user-1", {
        ...baseOptions,
        sortField: "AMOUNT",
        sortDirection: "ASC",
        page: 1,
        perPage: 5,
      });

      const lastCall = calls.at(-1);
      assert(!!lastCall, "findMany should be called once");
      assertDeepEqual(
        lastCall?.orderBy,
        [{ amount: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        "AMOUNT sort must include createdAt and id as stable tie-breakers",
      );
    },
  ],
  [
    "uses stable ordering for TITLE listing",
    async () => {
      const { prisma, calls } = createFindManyRepository();
      const repository = new TransactionRepository(prisma as unknown as PrismaClient);

      await repository.findListByUser("user-1", {
        ...baseOptions,
        sortField: "TITLE",
        sortDirection: "ASC",
        page: 3,
        perPage: 20,
      });

      const lastCall = calls.at(-1);
      assert(!!lastCall, "findMany should be called once");
      assertDeepEqual(
        lastCall?.orderBy,
        [{ title: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        "TITLE sort must include createdAt and id as stable tie-breakers",
      );
    },
  ],
  [
    "preserves pagination with deterministic tie-breakers in recent list",
    async () => {
      const { prisma, calls } = createFindManyRepository();
      const repository = new TransactionRepository(prisma as unknown as PrismaClient);

      await repository.findRecentByUser(
        "user-1",
        { from: new Date("2026-01-01"), to: new Date("2026-12-31") },
        8,
      );

      const lastCall = calls.at(-1);
      assert(!!lastCall, "findMany should be called once");
      assertDeepEqual(
        lastCall?.orderBy,
        { date: "desc", createdAt: "desc", id: "desc" },
        "Recent list must also use stable ordering",
      );
      assert(lastCall?.take === 8, "Recent list should keep requested limit");
    },
  ],
];

const run = async () => {
  for (const [name, test] of tests) {
    await test();
    console.log(`transaction-repository: ${name}`);
  }
  console.log("transaction-repository: all scenarios passed");
};

run().catch((error) => {
  console.error(`transaction-repository failed: ${error.message}`);
  process.exit(1);
});
