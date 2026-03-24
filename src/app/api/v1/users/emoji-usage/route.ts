import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import User from '@/lib/models/User';
import sequelize from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureColumn() {
  await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "emojiUsage" JSONB`);
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureColumn();
  const user = await User.findByPk(session.id, { attributes: ['emojiUsage'] });
  return NextResponse.json({ emojiUsage: user?.emojiUsage ?? {} });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { emoji } = await req.json();
  if (!emoji) return NextResponse.json({ error: 'Missing emoji' }, { status: 400 });

  await ensureColumn();
  const user = await User.findByPk(session.id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const current: Record<string, number> = (user.emojiUsage as Record<string, number>) ?? {};
  current[emoji] = (current[emoji] ?? 0) + 1;
  user.emojiUsage = current;
  user.changed('emojiUsage', true);
  await user.save();

  return NextResponse.json({ ok: true });
}
