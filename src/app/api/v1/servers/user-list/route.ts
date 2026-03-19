import { NextRequest, NextResponse } from 'next/server';
import Server from '@/lib/models/Server';

export async function GET(req: NextRequest) {
  const serverId = req.nextUrl.searchParams.get('serverId');
  const server = await Server.findByPk(Number(serverId));
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 422 });
  return NextResponse.json(server.userList ?? []);
}

export async function PUT(req: NextRequest) {
  const { active, imageUrl, type, userId, username, serverId } = await req.json();
  if (!type || !userId || !username || !serverId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const server = await Server.findByPk(serverId);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 422 });

  const list = server.userList as Record<string, unknown>[];
  const idx = list.findIndex(u => u.userId === userId);
  if (idx < 0) return NextResponse.json({ error: 'User not on server' }, { status: 422 });

  list[idx] = { type, active, userId, imageUrl, username };
  server.changed('userList', true);
  await server.save();
  return NextResponse.json(server.userList);
}
