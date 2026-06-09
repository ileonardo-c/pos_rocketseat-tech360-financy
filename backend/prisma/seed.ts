import { compare, hash } from "bcryptjs";
import { prisma } from "../src/prisma/client";

const seedName = process.env.E2E_SEED_NAME?.trim() || "Financy Admin";
const seedEmail = process.env.E2E_SEED_EMAIL?.trim() || "admin@financy.local";
const seedPassword = process.env.E2E_SEED_PASSWORD?.trim() || "TestAdmin123!";

type SeedCategory = {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
};

type SeedTransaction = {
  title: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryKey: string;
  day: number;
};

const seedCategories: SeedCategory[] = [
  {
    key: "food",
    name: "Alimentação",
    description: "Restaurantes, delivery e refeições",
    icon: "utensils",
    color: "blue",
  },
  {
    key: "transport",
    name: "Transporte",
    description: "Mobilidade, combustível e viagens",
    icon: "car-front",
    color: "purple",
  },
  {
    key: "market",
    name: "Mercado",
    description: "Compras recorrentes e supermercado",
    icon: "shopping-cart",
    color: "orange",
  },
  {
    key: "investment",
    name: "Investimento",
    description: "Aplicações, rendimentos e aportes",
    icon: "piggy-bank",
    color: "green",
  },
  {
    key: "entertainment",
    name: "Entretenimento",
    description: "Cinema, streaming e lazer",
    icon: "ticket",
    color: "pink",
  },
  {
    key: "utilities",
    name: "Utilidades",
    description: "Casa, serviços e contas essenciais",
    icon: "tool-case",
    color: "yellow",
  },
  {
    key: "salary",
    name: "Salário",
    description: "Receitas de trabalho e renda fixa",
    icon: "briefcase-business",
    color: "green",
  },
];

const seedTransactions: SeedTransaction[] = [
  {
    title: "Salário mensal",
    description: "Receita principal do mês",
    amount: 2500,
    type: "INCOME",
    categoryKey: "salary",
    day: 5,
  },
  {
    title: "Rendimento de investimento",
    description: "Receita de aplicações",
    amount: 340.25,
    type: "INCOME",
    categoryKey: "investment",
    day: 12,
  },
  {
    title: "Jantar no restaurante",
    description: "Restaurante no fim de semana",
    amount: 89.5,
    type: "EXPENSE",
    categoryKey: "food",
    day: 30,
  },
  {
    title: "Corrida por aplicativo",
    description: "Deslocamento urbano",
    amount: 45.9,
    type: "EXPENSE",
    categoryKey: "transport",
    day: 16,
  },
  {
    title: "Compras do mês",
    description: "Supermercado e itens recorrentes",
    amount: 329.4,
    type: "EXPENSE",
    categoryKey: "market",
    day: 20,
  },
  {
    title: "Cinema",
    description: "Ingressos e pipoca",
    amount: 119.5,
    type: "EXPENSE",
    categoryKey: "entertainment",
    day: 24,
  },
  {
    title: "Conta de luz",
    description: "Despesa residencial",
    amount: 1700,
    type: "EXPENSE",
    categoryKey: "utilities",
    day: 10,
  },
];

const clampDayToMonth = (year: number, month: number, day: number) => {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
};

const getSeedDate = (day: number) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return new Date(Date.UTC(year, month, clampDayToMonth(year, month, day), 12, 0, 0, 0));
};

const ensureSeedUser = async () => {
  const existingUser = await prisma.user.findUnique({
    where: { email: seedEmail },
  });

  const normalizedPassword = await hash(seedPassword, 10);

  if (existingUser) {
    const isPasswordValid = await compare(seedPassword, existingUser.password);
    const updates: { name?: string; password?: string } = {};

    if (existingUser.name !== seedName) {
      updates.name = seedName;
    }

    if (!isPasswordValid) {
      updates.password = normalizedPassword;
    }

    if (Object.keys(updates).length > 0) {
      const updatedUser = await prisma.user.update({
        where: { email: seedEmail },
        data: updates,
      });
      console.log(`[prisma-seed] Seed user ${seedEmail} updated`);
      return updatedUser;
    }

    console.log(`[prisma-seed] Seed user ${seedEmail} already aligned`);
    return existingUser;
  }

  const createdUser = await prisma.user.create({
    data: {
      name: seedName,
      email: seedEmail,
      password: normalizedPassword,
    },
  });
  console.log(`[prisma-seed] Seed user ${seedEmail} created`);
  return createdUser;
};

const ensureSeedCategories = async (userId: string) => {
  const categoriesByKey = new Map<string, { id: string }>();

  for (const category of seedCategories) {
    const persisted = await prisma.category.upsert({
      where: {
        userId_name: {
          userId,
          name: category.name,
        },
      },
      create: {
        name: category.name,
        description: category.description,
        icon: category.icon,
        color: category.color,
        userId,
      },
      update: {
        description: category.description,
        icon: category.icon,
        color: category.color,
      },
      select: {
        id: true,
      },
    });

    categoriesByKey.set(category.key, persisted);
  }

  console.log(`[prisma-seed] ${seedCategories.length} categories aligned`);
  return categoriesByKey;
};

const ensureSeedTransactions = async (
  userId: string,
  categoriesByKey: Map<string, { id: string }>,
) => {
  for (const transaction of seedTransactions) {
    const category = categoriesByKey.get(transaction.categoryKey);
    if (!category) {
      throw new Error(`Missing seed category for ${transaction.title}`);
    }

    const existing = await prisma.transaction.findFirst({
      where: {
        userId,
        title: transaction.title,
        categoryId: category.id,
      },
      select: {
        id: true,
      },
    });

    const payload = {
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      date: getSeedDate(transaction.day),
      categoryId: category.id,
    };

    if (existing) {
      await prisma.transaction.update({
        where: { id: existing.id },
        data: payload,
      });
      continue;
    }

    await prisma.transaction.create({
      data: {
        title: transaction.title,
        userId,
        ...payload,
      },
    });
  }

  console.log(`[prisma-seed] ${seedTransactions.length} transactions aligned`);
};

const main = async () => {
  try {
    const user = await ensureSeedUser();
    const categoriesByKey = await ensureSeedCategories(user.id);
    await ensureSeedTransactions(user.id, categoriesByKey);
    await prisma.$disconnect();
  } catch (error) {
    await prisma.$disconnect();
    console.error("[prisma-seed] Error:", (error as Error).message);
    process.exit(1);
  }
};

void main();
