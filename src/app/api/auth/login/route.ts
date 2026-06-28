import { NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { checkPass, signToken, publicUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const u = await db().getUserByEmail(email || '');
    
    if (!u || !checkPass(password || '', u.pass)) {
      return NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 });
    }
    
    return NextResponse.json({ token: signToken(u), user: publicUser(u) }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
