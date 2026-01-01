import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void;

export function requireRole(roles: string | string[]): (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

export function generateToken(
  userId: string,
  email: string,
  role?: string
): string;

export function verifyToken(token: string): Promise<{
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
} | null>;
