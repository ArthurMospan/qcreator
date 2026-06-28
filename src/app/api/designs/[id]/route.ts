import { NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { getUserFromRequest } from '@/lib/auth';

async function ownProject(user: any, id: string) {
  const p = await db().getProject(id);
  return p && p.org_id === user.org_id ? p : null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
    const d = await db().getDesign(id);
    if (!d || !(await ownProject(user, d.project_id))) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ design: d }, { status: 200 });
  } catch (error) {
    console.error('Get design error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });

    const d = await db().getDesign(id);
    if (!d || !(await ownProject(user, d.project_id))) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const body = await req.json();
    const updated = await db().updateDesign(d.id, {
      name: body.name ?? d.name,
      format: body.format ?? d.format,
      slides: body.slides ?? d.slides
    });

    return NextResponse.json({ design: updated }, { status: 200 });
  } catch (error) {
    console.error('Update design error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });

    const d = await db().getDesign(id);
    if (!d || !(await ownProject(user, d.project_id))) return NextResponse.json({ error: 'not found' }, { status: 404 });

    await db().deleteDesign(d.id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Delete design error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
