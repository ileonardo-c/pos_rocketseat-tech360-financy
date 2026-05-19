import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { GraphQLContext } from "../../context";
import type { AuthRepository } from "./auth-repository";

const JWT_SECRET = process.env.JWT_SECRET || "secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async register(name: string, email: string, password: string) {
    const hashed = await bcrypt.hash(password, 10);
    const user = await this.repository.createUser(name, email, hashed);
    const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"] };
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, {
      ...signOptions,
    });

    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  async login(email: string, password: string) {
    const user = await this.repository.findByEmail(email);
    if (!user) {
      throw new Error("Credenciais inválidas");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error("Credenciais inválidas");
    }

    const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"] };
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, {
      ...signOptions,
    });

    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  async me(ctx: GraphQLContext) {
    if (!ctx.userId) {
      throw new Error("Não autenticado");
    }

    const user = await this.repository.findById(ctx.userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    return { id: user.id, name: user.name, email: user.email };
  }
}
