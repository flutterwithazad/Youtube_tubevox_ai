import jwt from 'jsonwebtoken';
import type { Request } from 'express';

const SECRET = process.env['ADMIN_JWT_SECRET'] ?? 'fallback-dev-secret-please-set-env';

export interface AdminPayload {
  adminId: string;
  email: string;
  roleId: string;
  roleName: string;
  fullName: string;
  permissions: Record<string, boolean>;
}

export function signAdminToken(payload: AdminPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
}

export function verifyAdminToken(token: string): AdminPayload {
  return jwt.verify(token, SECRET) as AdminPayload;
}

export function getAdminFromRequest(req: Request): AdminPayload | null {
  try {
    const token = req.cookies?.admin_token || req.headers['x-admin-token'];
    if (!token) return null;
    return verifyAdminToken(token as string);
  } catch {
    return null;
  }
}

export function requireAdmin(req: Request): AdminPayload {
  const admin = getAdminFromRequest(req);
  if (!admin) throw new Error('Unauthorized');
  return admin;
}
