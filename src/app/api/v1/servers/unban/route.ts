import { NextRequest, NextResponse } from 'next/server';
import Server from '@/lib/models/Server';

export async function POST(req: NextRequest) {
  const { userId, serverId } = await req.json();
  const server = await Server.findByPk(serverId);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 422 });

  if (!server.userBans) server.userBans = [];
  const bans = server.userBans as Record<string, unknown>[];
  const idx = bans.findIndex(b => b.userId === userId);
  if (idx > -1) bans.splice(idx, 1);
  server.changed('userBans', true);
  await server.save();
  return NextResponse.json(server.userBans ?? []);
}
