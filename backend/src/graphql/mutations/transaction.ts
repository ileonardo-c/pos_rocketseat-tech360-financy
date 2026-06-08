import type { GraphQLContext } from "@/context";
import { StorageService } from "@/features/storage/storage-service";
import { TransactionRepository } from "@/features/transaction/transaction-repository";
import { TransactionService } from "@/features/transaction/transaction-service";
import { getStorageConfig } from "@/lib/storage-env";
import { S3Client } from "@aws-sdk/client-s3";

const createS3Client = () => {
  const { region, accessKeyId, secretAccessKey, endpoint, forcePathStyle } = getStorageConfig();
  return new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
  });
};

const service = (ctx: GraphQLContext) =>
  new TransactionService(new TransactionRepository(ctx.prisma));

const serviceWithStorage = (ctx: GraphQLContext) => {
  const s3Client = createS3Client();
  const storageService = new StorageService(s3Client);
  return new TransactionService(new TransactionRepository(ctx.prisma), storageService);
};

const serviceForReceiptInput = (ctx: GraphQLContext, input: { receiptKey?: string | null }) => {
  if (input.receiptKey?.trim()) {
    return serviceWithStorage(ctx);
  }

  return service(ctx);
};

export const transactionMutations = {
  createTransaction: async (
    _: unknown,
    args: {
      input: {
        title: string;
        description?: string | null;
        amount: number;
        type: "INCOME" | "EXPENSE";
        date: string;
        categoryId: string;
        receiptKey?: string | null;
        receiptUrl?: string | null;
      };
    },
    ctx: GraphQLContext,
  ) => {
    return serviceForReceiptInput(ctx, args.input).create(ctx, {
      title: args.input.title,
      description: args.input.description,
      amount: args.input.amount,
      type: args.input.type,
      date: args.input.date,
      categoryId: args.input.categoryId,
      receiptKey: args.input.receiptKey,
      receiptUrl: args.input.receiptUrl,
    });
  },

  updateTransaction: async (
    _: unknown,
    args: {
      id: string;
      input: {
        title?: string;
        description?: string | null;
        amount?: number;
        type?: "INCOME" | "EXPENSE";
        date?: string;
        categoryId?: string;
        receiptKey?: string | null;
        receiptUrl?: string | null;
      };
    },
    ctx: GraphQLContext,
  ) => {
    return serviceWithStorage(ctx).update(ctx, args.id, {
      ...args.input,
    });
  },

  deleteTransaction: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
    return serviceWithStorage(ctx).delete(ctx, args.id);
  },
};
