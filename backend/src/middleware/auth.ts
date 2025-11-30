import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import env from '../config/env';

export interface AuthUser {
  id: number;
  email: string;
  smartAccountAddress: string;
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication failed' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload & {
      userId: number;
      email: string;
      smartAccountAddress: string;
    };

    req.user = {
      id: payload.userId,
      email: payload.email,
      smartAccountAddress: payload.smartAccountAddress
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Authentication failed' });
  }
};
