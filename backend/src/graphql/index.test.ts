import type { GraphQLContext } from "@/context";
import { resolvers } from "./index";

type TransactionCountInput = {
  where: {
    userId?: string;
    categoryId: string;
  };
};

const withPrismaCountSpy = (countResult: number) => {
  const countCalls: TransactionCountInput[] = [];
  const count = async (args: TransactionCountInput) => {
    countCalls.push(args);
    return countResult;
  };

  const ctx = {
    prisma: {
      transaction: {
        count,
      },
    },
  } as unknown as GraphQLContext & {
    prisma: { transaction: { count: typeof count; countCalls: TransactionCountInput[] } };
  };

  return {
    ctx,
    countCalls,
    count,
  };
};

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const createResolver = () => resolvers.Category.transactionsCount;

const tests: Array<[string, () => Promise<void>]> = [
  [
    "uses preloaded transactionsCount when present",
    async () => {
      const { ctx, countCalls } = withPrismaCountSpy(7);
      const result = await createResolver()(
        {
          id: "category-1",
          transactionsCount: 9,
          _count: { transactions: 3 },
        },
        undefined,
        ctx,
      );
      assert(result === 9, "Preloaded transactionsCount must be used instead of fallback");
      assert(countCalls.length === 0, "Resolver must not call DB when count is already loaded");
    },
  ],
  [
    "uses _count.transactions when resolver receives it",
    async () => {
      const { ctx, countCalls } = withPrismaCountSpy(5);
      const result = await createResolver()(
        {
          id: "category-2",
          _count: { transactions: 4 },
        },
        undefined,
        ctx,
      );
      assert(result === 4, "Resolver should return _count.transactions when available");
      assert(countCalls.length === 0, "Resolver should not query count when _count is present");
    },
  ],
  [
    "queries transaction table when nested category lacks preloaded count",
    async () => {
      const { ctx, countCalls } = withPrismaCountSpy(6);
      const result = await createResolver()(
        {
          id: "category-3",
        },
        undefined,
        ctx,
      );
      assert(result === 6, "Resolver should fallback to counting transactions by category id");
      assert(countCalls.length === 1, "Fallback should issue one count query");
      assert(
        countCalls[0]?.where?.categoryId === "category-3",
        "Count query should filter by category id",
      );
    },
  ],
  [
    "filters fallback count by user when category userId is present",
    async () => {
      const { ctx, countCalls } = withPrismaCountSpy(9);
      const result = await createResolver()(
        {
          id: "category-4",
          userId: "user-1",
        },
        undefined,
        ctx,
      );
      assert(result === 9, "Resolver should return scoped transaction count");
      assert(countCalls.length === 1, "Fallback should issue one scoped count query");
      assert(
        countCalls[0]?.where?.userId === "user-1",
        "Count query should include userId from the loaded category",
      );
    },
  ],
  [
    "returns 0 when category identifier is missing and no count was preloaded",
    async () => {
      const { ctx, countCalls } = withPrismaCountSpy(8);
      const result = await createResolver()({}, undefined, ctx);
      assert(result === 0, "Missing category id should return 0 instead of throwing");
      assert(countCalls.length === 0, "Count query should not run without category id");
    },
  ],
];

const run = async () => {
  for (const [name, test] of tests) {
    await test();
    console.log(`graphql-category-counts: ${name}`);
  }
  console.log("graphql-category-counts: all scenarios passed");
};

run().catch((error) => {
  console.error(`graphql-category-counts failed: ${error.message}`);
  process.exit(1);
});
