import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/User';

export async function PUT(req: NextRequest) {
  const { userId, serverId, active } = await req.json();
  const user = await User.findByPk(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 422 });

  const list = user.serversList as Record<string, unknown>[];
  const idx = list.findIndex(s => s.serverId === serverId);
  if (idx < 0) return NextResponse.json({ error: 'Server not found' }, { status: 422 });

  list[idx].active = active;
  user.changed('serversList', true);
  await user.save();
  return NextResponse.json(user.serversList);
}
