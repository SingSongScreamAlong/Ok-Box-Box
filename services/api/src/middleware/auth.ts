import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { logger } from '../logger.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    machineId?: string;
    modules: string[];
    type: 'relay' | 'app';
  };
}

/**
 * Middleware to authenticate JWT tokens
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      machineId?: string;
      modules: string[];
      type: 'relay' | 'app';
    };

    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (err) {
    logger.warn('Invalid token:', err);
    res.status(403).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware to require specific modules
 */
export function requireModule(...modules: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const hasModule = modules.some(m => user.modules.includes(m));
    if (!hasModule) {
      res.status(403).json({ error: 'Module not licensed' });
      return;
    }

    next();
  };
}
