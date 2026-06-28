import { NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { checkPass, signToken, publicUser } from '@/lib/auth';
import { optionsResponse, withCors } from '@/lib/cors';

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const u = await db().getUserByEmail(email || '');

    if (!u || !checkPass(password || '', u.pass)) {
      return withCors(NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 }));
    }

    return withCors(NextResponse.json({ token: signToken(u), user: publicUser(u) }, { status: 200 }));
  } catch (error) {
    console.error('Login error:', error);
    return withCors(NextResponse.json({ error: 'Server error' }, { status: 500 }));
  }
}
