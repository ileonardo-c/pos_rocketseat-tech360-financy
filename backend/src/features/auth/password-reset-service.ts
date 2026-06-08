import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getOptionalEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createTransport as createMailTransport } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { AuthRepository } from "./auth-repository";

type PasswordResetRequestContext = {
  email: string;
  requestedIp: string | null;
  userAgent: string | null;
};

type PasswordResetConfirmInput = {
  email: string;
  code: string;
  newPassword: string;
};

type PasswordResetCode = {
  id: string;
  userId: string;
  email: string;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  usedAt: Date | null;
};

type PasswordResetCodePersistenceInput = {
  userId: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
  maxAttempts: number;
  requestedIp: string | null;
  userAgent: string | null;
};

type PasswordResetMailSettings = {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  from: string;
};

type PasswordResetServiceOptions = {
  createTransport?: typeof createMailTransport;
};

const MIN_PASSWORD_LENGTH = 8;

export class PasswordResetService {
  private readonly codeTtlSeconds: number;
  private readonly maxAttempts: number;
  private readonly pepper: string;
  private readonly createTransport: typeof createMailTransport;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: AuthRepository,
    options: PasswordResetServiceOptions = {},
  ) {
    this.codeTtlSeconds = this.parsePositiveInteger(
      getOptionalEnv("RESET_CODE_TTL_SECONDS") || "900",
      "RESET_CODE_TTL_SECONDS",
    );
    this.maxAttempts = this.parsePositiveInteger(
      getOptionalEnv("RESET_CODE_MAX_ATTEMPTS") || "5",
      "RESET_CODE_MAX_ATTEMPTS",
    );
    this.pepper = getOptionalEnv("RESET_CODE_PEPPER") || "financy-reset-pepper";
    this.createTransport = options.createTransport ?? createMailTransport;
  }

  async request(input: PasswordResetRequestContext) {
    const email = this.normalizeEmail(input.email);
    const mailSettings = this.resolveMailSettings();
    const user = await this.repository.findByEmail(email);
    if (!user) {
      return true;
    }

    const requestCooldownSeconds = this.parsePositiveInteger(
      getOptionalEnv("RESET_CODE_REQUEST_COOLDOWN_SECONDS") || "60",
      "RESET_CODE_REQUEST_COOLDOWN_SECONDS",
    );
    const requestCooldownWindowStart = new Date(Date.now() - requestCooldownSeconds * 1000);
    const recentRequestCount = await this.repository.countPasswordResetCodesByUser(
      user.id,
      requestCooldownWindowStart,
    );
    if (recentRequestCount > 0) {
      return true;
    }

    const payload = this.createPayload({
      email,
      userId: user.id,
      requestedIp: input.requestedIp,
      userAgent: input.userAgent,
    });
    const { plainCode, ...codeToPersist } = payload;

    await this.repository.markOlderPasswordResetCodesAsUsed(
      user.id,
      new Date(Date.now() - 5 * 60 * 1000),
    );
    const createdCode = await this.repository.createPasswordResetCode(codeToPersist);

    try {
      await this.sendResetCodeEmail(email, plainCode, mailSettings);
    } catch (error) {
      await this.repository.markPasswordResetCodeAsUsed(createdCode.id);
      throw error;
    }

    return true;
  }

  async reset(input: PasswordResetConfirmInput) {
    const email = this.normalizeEmail(input.email);
    if (input.newPassword.trim().length < MIN_PASSWORD_LENGTH) {
      throw new AppError("Invalid new password", 422, "AUTH_INVALID_PASSWORD");
    }

    const normalizedCode = this.normalizeOtp(input.code);

    const user = await this.repository.findByEmail(email);
    if (!user) {
      throw new AppError("Invalid reset code", 422, "PASSWORD_RESET_CODE_INVALID");
    }

    const codeRecord = await this.repository.findActivePasswordResetCode(email, user.id);
    if (!codeRecord) {
      throw new AppError("Invalid reset code", 422, "PASSWORD_RESET_CODE_INVALID");
    }

    if (!this.verifyCode(codeRecord, normalizedCode)) {
      const attempts = await this.repository.incrementPasswordResetAttempts(codeRecord.id);
      if (attempts.attempts >= codeRecord.maxAttempts) {
        throw new AppError(
          "Code verification failed too many times",
          422,
          "PASSWORD_RESET_CODE_EXHAUSTED",
        );
      }
      throw new AppError("Invalid reset code", 422, "PASSWORD_RESET_CODE_INVALID");
    }

    await this.prisma.$transaction(async (transactionPrisma) => {
      const transactionRepository = new AuthRepository(transactionPrisma as PrismaClient);
      const hashedPassword = await bcrypt.hash(input.newPassword.trim(), 10);
      await transactionPrisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      await transactionRepository.markActivePasswordResetCodesAsUsed(user.id, email);
    });

    return true;
  }

  private parsePositiveInteger(value: string, envName?: string) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new AppError(
        `Invalid reset configuration${envName ? ` for ${envName}` : ""}`,
        500,
        "CONFIG_ERROR",
      );
    }

    return parsed;
  }

  private createPayload({
    email,
    userId,
    requestedIp,
    userAgent,
  }: PasswordResetRequestContext & { userId: string }): PasswordResetCodePersistenceInput & {
    plainCode: string;
  } {
    const plainCode = String(randomInt(100000, 1_000_000)).padStart(6, "0");
    return {
      plainCode,
      userId,
      email,
      codeHash: this.hashCode(plainCode),
      expiresAt: new Date(Date.now() + this.codeTtlSeconds * 1000),
      maxAttempts: this.maxAttempts,
      requestedIp,
      userAgent,
    };
  }

  private normalizeOtp(value: string) {
    const normalized = value.trim();
    if (!/^\d{6}$/.test(normalized)) {
      throw new AppError("Invalid reset code", 422, "PASSWORD_RESET_CODE_INVALID");
    }
    return normalized;
  }

  private verifyCode(codeRecord: PasswordResetCode, plainCode: string) {
    if (codeRecord.expiresAt.getTime() < Date.now()) {
      throw new AppError("Reset code expired", 422, "PASSWORD_RESET_CODE_EXPIRED");
    }

    if (codeRecord.attempts >= codeRecord.maxAttempts) {
      throw new AppError(
        "Reset code verification failed too many times",
        422,
        "PASSWORD_RESET_CODE_EXHAUSTED",
      );
    }

    const expected = codeRecord.codeHash;
    const provided = this.hashCode(plainCode);

    if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"))) {
      return false;
    }

    return true;
  }

  private hashCode(code: string) {
    return createHmac("sha256", this.pepper).update(code).digest("hex");
  }

  private normalizeEmail(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      throw new AppError("Invalid email", 422, "AUTH_INVALID_EMAIL");
    }

    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    if (!isValid) {
      throw new AppError("Invalid email", 422, "AUTH_INVALID_EMAIL");
    }

    return normalized;
  }

  private resolveMailSettings(): PasswordResetMailSettings {
    const smtpHost = getOptionalEnv("SMTP_HOST");
    const smtpPort = Number(getOptionalEnv("SMTP_PORT") || "587");
    const smtpSecure = getOptionalEnv("SMTP_SECURE") === "true";
    const smtpUser = getOptionalEnv("SMTP_USER");
    const smtpPassword = getOptionalEnv("SMTP_PASSWORD");
    const from = getOptionalEnv("MAIL_FROM");

    if (!smtpHost || !from) {
      console.warn("Password reset mail settings are missing.");
      throw new AppError(
        "Password reset email delivery is not configured",
        503,
        "PASSWORD_RESET_EMAIL_FAILED",
      );
    }

    return {
      smtpHost,
      smtpPort: Number.isFinite(smtpPort) ? smtpPort : 587,
      smtpSecure,
      smtpUser: smtpUser || undefined,
      smtpPassword: smtpPassword || undefined,
      from,
    };
  }

  private async sendResetCodeEmail(
    email: string,
    code: string,
    mailSettings: PasswordResetMailSettings,
  ): Promise<void> {
    const transportOptions: SMTPTransport.Options = {
      host: mailSettings.smtpHost,
      port: mailSettings.smtpPort,
      secure: mailSettings.smtpSecure,
    };
    if (mailSettings.smtpUser && mailSettings.smtpPassword) {
      transportOptions.auth = {
        user: mailSettings.smtpUser,
        pass: mailSettings.smtpPassword,
      };
    }

    const ttlMinutes = Math.max(1, Math.round(this.codeTtlSeconds / 60));
    const mailOptions = {
      from: mailSettings.from,
      to: email,
      subject: "Financy password reset code",
      html: `
        <p>You requested a password reset.</p>
        <p>Your code is <strong>${code}</strong>.</p>
        <p>This code expires in approximately ${ttlMinutes} minute(s).</p>
      `,
      text: `Your password reset code is ${code}. It expires in ${ttlMinutes} minute(s).`,
    };

    try {
      const transporter = this.createTransport(transportOptions);
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Failed to send password reset email", { email, error });
      throw new AppError(
        "Password reset email delivery failed",
        503,
        "PASSWORD_RESET_EMAIL_FAILED",
      );
    }
  }
}
