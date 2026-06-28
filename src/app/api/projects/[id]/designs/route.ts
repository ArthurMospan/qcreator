import { NextResponse } from 'next/server';
import { db } from '../../../../../../db';
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

    if (!(await ownProject(user, id))) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    return NextResponse.json({ designs: await db().listDesigns(id) }, { status: 200 });
  } catch (error) {
    console.error('List designs error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });

    if (!(await ownProject(user, id))) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const body = await req.json();
    if (!body.name || !body.format || !Array.isArray(body.slides)) {
      return NextResponse.json({ error: 'bad design' }, { status: 400 });
    }

    const design = await db().createDesign({
      projectId: id,
      templateId: body.templateId || null,
      name: body.name,
      format: body.format,
      slides: body.slides,
      createdBy: user.id
    });

    return NextResponse.json({ design }, { status: 200 });
  } catch (error) {
    console.error('Create design error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
