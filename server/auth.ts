import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function getCurrentUser(req: Request) {
  if (!req.session.userId) return null;
  const user = await storage.getUser(req.session.userId);
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}
