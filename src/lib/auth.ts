import crypto from 'crypto';
import { db } from '../../db';

const rawSecret = process.env.QC_SECRET;
if (!rawSecret) throw new Error('QC_SECRET env variable is required');
const SECRET = rawSecret;

const b64 = (s: string) => Buffer.from(s).toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString();

export function hashPass(pw: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(pw, salt, 32).toString('hex');
  return salt + ':' + h;
}

export function checkPass(pw: string, stored: string) {
  const [salt, h] = stored.split(':');
  if (!salt || !h) return false;
  const c = crypto.scryptSync(pw, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(c));
}

export function signToken(user: any) {
  const payload = b64(JSON.stringify({ id: user.id, role: user.role, t: Date.now() }));
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}

export async function verifyToken(token: string | null) {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  
  const exp = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (exp.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(sig))) return null;
  
  try {
    const data = JSON.parse(unb64(payload));
    return await db().getUserById(data.id);
  } catch (e) {
    return null;
  }
}

export const publicUser = (u: any) => u ? ({ id: u.id, email: u.email, name: u.name, role: u.role, org_id: u.org_id }) : null;

export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  return await verifyToken(token);
}
