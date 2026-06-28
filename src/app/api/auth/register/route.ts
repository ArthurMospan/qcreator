import { NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { hashPass, signToken, publicUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'email, password, name обовʼязкові' }, { status: 400 });
    }
    
    if (await db().getUserByEmail(email)) {
      return NextResponse.json({ error: 'Користувач з таким email вже існує' }, { status: 409 });
    }
    
    const org = await db().createOrg({ name: name + "'s workspace" });
    const user = await db().createUser({ 
      orgId: org.id, 
      email, 
      pass: hashPass(password), 
      name, 
      role: role === 'designer' ? 'designer' : 'smm' 
    });
    
    return NextResponse.json({ token: signToken(user), user: publicUser(user) }, { status: 200 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
