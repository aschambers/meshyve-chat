import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/User';
import Server from '@/lib/models/Server';

export async function POST(req: NextRequest) {
  const { serverId, userId } = await req.json();

  const user = await User.findByPk(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 422 });

  const sList = user.serversList as Record<string, unknown>[];
  const uIdx = sList.findIndex(s => s.serverId === serverId);
  if (uIdx > -1) sList.splice(uIdx, 1);
  user.changed('serversList', true);
  await user.save();

  const server = await Server.findByPk(serverId);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 422 });

  const list = server.userList as Record<string, unknown>[];
  const idx = list.findIndex(u => u.userId === userId);
  if (idx > -1) list.splice(idx, 1);
  server.changed('userList', true);
  await server.save();

  return NextResponse.json(server.userList);
}
