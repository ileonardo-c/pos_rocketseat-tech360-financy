import { AppError } from "@/lib/errors";
import type { Prisma, PrismaClient, User } from "@prisma/client";
import type { createTransport } from "nodemailer";
import type { AuthRepository } from "./auth-repository";
import { PasswordResetService } from "./password-reset-service";

type ResetCodeRecord = Prisma.PasswordResetCodeUncheckedCreateInput & {
  id: string;
  createdAt: Date;
  usedAt: Date | null;
};

type MailTransportState = {
  sent: unknown[];
  options: unknown[];
};

const envKeys = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "MAIL_FROM",
  "RESET_CODE_TTL_SECONDS",
  "RESET_CODE_MAX_ATTEMPTS",
  "RESET_CODE_REQUEST_COOLDOWN_SECONDS",
  "RESET_CODE_PEPPER",
] as const;

const baseResetEnv: Partial<Record<(typeof envKeys)[number], string>> = {
  SMTP_HOST: "smtp.local",
  SMTP_PORT: "1025",
  SMTP_SECURE: "false",
  MAIL_FROM: "no-reply@financy.local",
  RESET_CODE_TTL_SECONDS: "900",
  RESET_CODE_MAX_ATTEMPTS: "5",
  RESET_CODE_REQUEST_COOLDOWN_SECONDS: "60",
  RESET_CODE_PEPPER: "test-reset-pepper",
};

const resetOnlyEnv: Partial<Record<(typeof envKeys)[number], string>> = {
  RESET_CODE_TTL_SECONDS: "900",
  RESET_CODE_MAX_ATTEMPTS: "5",
  RESET_CODE_REQUEST_COOLDOWN_SECONDS: "60",
  RESET_CODE_PEPPER: "test-reset-pepper",
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const withResetEnv = async (
  overrides: Partial<Record<(typeof envKeys)[number], string | undefined>>,
  callback: () => Promise<void>,
) => {
  const previousValues = new Map<string, string | undefined>();
  for (const key of envKeys) {
    previousValues.set(key, process.env[key]);
    const nextValue = overrides[key];
    if (typeof nextValue === "string") {
      process.env[key] = nextValue;
    } else {
      delete process.env[key];
    }
  }

  try {
    await callback();
  } finally {
    for (const key of envKeys) {
      const previousValue = previousValues.get(key);
      if (typeof previousValue === "string") {
        process.env[key] = previousValue;
      } else {
        delete process.env[key];
      }
    }
  }
};

const withMutedConsole = async (callback: () => Promise<void>) => {
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = () => undefined;
  console.warn = () => undefined;

  try {
    await callback();
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
};

const buildUser = (email: string): User => {
  const now = new Date();
  return {
    id: `user-${email}`,
    name: "Password Reset User",
    email,
    avatarKey: null,
    avatarUrl: null,
    password: "hashed-password",
    createdAt: now,
    updatedAt: now,
  };
};

class AuthRepositoryFake {
  readonly users = new Map<string, User>();
  readonly resetCodes: ResetCodeRecord[] = [];
  findByEmailCalls = 0;

  async findByEmail(email: string): Promise<User | null> {
    this.findByEmailCalls += 1;
    return this.users.get(email) ?? null;
  }

  async countPasswordResetCodesByUser(userId: string, since: Date): Promise<number> {
    return this.resetCodes.filter(
      (code) => code.userId === userId && code.usedAt === null && code.createdAt >= since,
    ).length;
  }

  async markOlderPasswordResetCodesAsUsed(userId: string, before: Date) {
    for (const code of this.resetCodes) {
      if (
        code.userId === userId &&
        (code.expiresAt < before || (code.usedAt !== null && code.usedAt < before))
      ) {
        code.usedAt = new Date();
      }
    }
    return { count: 0 };
  }

  async createPasswordResetCode(data: Prisma.PasswordResetCodeUncheckedCreateInput) {
    const record: ResetCodeRecord = {
      ...data,
      id: typeof data.id === "string" ? data.id : `reset-code-${this.resetCodes.length + 1}`,
      createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(),
      usedAt: data.usedAt instanceof Date ? data.usedAt : null,
    };
    this.resetCodes.push(record);
    return record;
  }

  async markActivePasswordResetCodesAsUsed(userId: string, email: string) {
    let count = 0;
    for (const code of this.resetCodes) {
      if (code.userId === userId && code.email === email && code.usedAt === null) {
        code.usedAt = new Date();
        count += 1;
      }
    }
    return { count };
  }

  async markPasswordResetCodeAsUsed(id: string) {
    const code = this.resetCodes.find((item) => item.id === id);
    if (!code) {
      throw new Error(`Reset code not found: ${id}`);
    }
    code.usedAt = new Date();
    return code;
  }
}

const createService = (
  repository: AuthRepositoryFake,
  createTransportOverride: typeof createTransport,
) =>
  new PasswordResetService({} as PrismaClient, repository as unknown as AuthRepository, {
    createTransport: createTransportOverride,
  });

const createSuccessfulTransport = (state: MailTransportState) =>
  ((options: unknown) => {
    state.options.push(options);
    return {
      sendMail: async (mailOptions: unknown) => {
        state.sent.push(mailOptions);
        return { accepted: ["ok"] };
      },
    };
  }) as unknown as typeof createTransport;

const createFailingTransport = (state: MailTransportState) =>
  ((options: unknown) => {
    state.options.push(options);
    return {
      sendMail: async (mailOptions: unknown) => {
        state.sent.push(mailOptions);
        throw new Error("SMTP unavailable");
      },
    };
  }) as unknown as typeof createTransport;

const createFailingTransportFactory = (state: MailTransportState) =>
  ((options: unknown) => {
    state.options.push(options);
    throw new Error("SMTP transport unavailable");
  }) as unknown as typeof createTransport;

const createUnexpectedTransport = () =>
  (() => {
    throw new Error("Transport should not be created");
  }) as unknown as typeof createTransport;

const expectPasswordResetEmailFailed = async (callback: () => Promise<unknown>) => {
  try {
    await callback();
  } catch (error) {
    if (!(error instanceof AppError)) {
      throw new Error("Expected password reset delivery failure to use AppError");
    }
    assert(error.statusCode === 503, `Expected status 503, got ${error.statusCode}`);
    assert(
      error.code === "PASSWORD_RESET_EMAIL_FAILED",
      `Expected PASSWORD_RESET_EMAIL_FAILED, got ${error.code}`,
    );
    return;
  }

  throw new Error("Expected password reset request to fail");
};

const requestContext = (email: string) => ({
  email,
  requestedIp: "127.0.0.1",
  userAgent: "password-reset-service-test",
});

const tests: Array<[string, () => Promise<void>]> = [
  [
    "returns generic success for nonexistent users without touching persistence",
    async () => {
      await withResetEnv(baseResetEnv, async () => {
        const repository = new AuthRepositoryFake();
        const mailState: MailTransportState = { sent: [], options: [] };
        const service = createService(repository, createSuccessfulTransport(mailState));

        const result = await service.request(requestContext("missing@financy.local"));

        assert(result === true, "Missing users must keep the generic success response");
        assert(repository.resetCodes.length === 0, "Missing users must not create reset codes");
        assert(mailState.sent.length === 0, "Missing users must not receive reset emails");
      });
    },
  ],
  [
    "returns success for existing users when email delivery succeeds",
    async () => {
      await withResetEnv(baseResetEnv, async () => {
        const repository = new AuthRepositoryFake();
        const user = buildUser("success@financy.local");
        const mailState: MailTransportState = { sent: [], options: [] };
        repository.users.set(user.email, user);
        const service = createService(repository, createSuccessfulTransport(mailState));

        const result = await service.request(requestContext(user.email));

        assert(result === true, "Successful delivery must return success");
        assert(mailState.sent.length === 1, "Successful delivery must send one email");
        assert(
          repository.resetCodes.length === 1,
          "Successful delivery must create one reset code",
        );
        assert(repository.resetCodes[0]?.usedAt === null, "Successful reset code must stay active");
      });
    },
  ],
  [
    "returns a controlled error for existing users when SMTP delivery fails",
    async () => {
      await withResetEnv(baseResetEnv, async () => {
        const repository = new AuthRepositoryFake();
        const user = buildUser("smtp-failure@financy.local");
        const mailState: MailTransportState = { sent: [], options: [] };
        repository.users.set(user.email, user);
        await repository.createPasswordResetCode({
          userId: user.id,
          email: user.email,
          codeHash: "previous-code",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          maxAttempts: 5,
          requestedIp: "127.0.0.1",
          userAgent: "password-reset-service-test",
          createdAt: new Date(Date.now() - 2 * 60 * 1000),
        });
        const service = createService(repository, createFailingTransport(mailState));

        await withMutedConsole(async () => {
          await expectPasswordResetEmailFailed(async () =>
            service.request(requestContext(user.email)),
          );
        });

        assert(mailState.sent.length === 1, "SMTP failure scenario must attempt delivery once");
        assert(repository.resetCodes.length === 2, "SMTP failure creates a code before delivery");
        assert(
          repository.resetCodes[0]?.usedAt === null,
          "SMTP failure must not invalidate previously active codes",
        );
        assert(
          repository.resetCodes[1]?.usedAt instanceof Date,
          "SMTP failure must invalidate the undelivered reset code",
        );
      });
    },
  ],
  [
    "returns a controlled error for existing users when SMTP transport setup fails",
    async () => {
      await withResetEnv(baseResetEnv, async () => {
        const repository = new AuthRepositoryFake();
        const user = buildUser("smtp-transport-failure@financy.local");
        const mailState: MailTransportState = { sent: [], options: [] };
        repository.users.set(user.email, user);
        const service = createService(repository, createFailingTransportFactory(mailState));

        await withMutedConsole(async () => {
          await expectPasswordResetEmailFailed(async () =>
            service.request(requestContext(user.email)),
          );
        });

        assert(mailState.options.length === 1, "SMTP transport setup must be attempted once");
        assert(mailState.sent.length === 0, "SMTP transport setup failure must not send email");
        assert(
          repository.resetCodes.length === 1,
          "SMTP transport setup failure creates a code before delivery",
        );
        assert(
          repository.resetCodes[0]?.usedAt instanceof Date,
          "SMTP transport setup failure must invalidate the undelivered reset code",
        );
      });
    },
  ],
  [
    "returns a controlled error before account lookup when mail settings are missing",
    async () => {
      await withResetEnv(resetOnlyEnv, async () => {
        const repository = new AuthRepositoryFake();
        const user = buildUser("missing-config@financy.local");
        repository.users.set(user.email, user);
        const service = createService(repository, createUnexpectedTransport());

        await withMutedConsole(async () => {
          await expectPasswordResetEmailFailed(async () =>
            service.request(requestContext(user.email)),
          );
        });

        assert(
          repository.resetCodes.length === 0,
          "Missing mail settings must fail before creating reset codes",
        );
        assert(
          repository.findByEmailCalls === 0,
          "Missing mail settings must fail before account lookup",
        );
      });
    },
  ],
];

const run = async () => {
  for (const [name, test] of tests) {
    await test();
    console.log(`password-reset-service: ${name}`);
  }

  console.log("password-reset-service: all scenarios passed");
};

run().catch((error) => {
  console.error(`password-reset-service failed: ${error.message}`);
  process.exit(1);
});
