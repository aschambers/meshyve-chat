import { NextRequest, NextResponse } from 'next/server';
import Server from '@/lib/models/Server';

export async function GET(req: NextRequest) {
  const serverId = req.nextUrl.searchParams.get('serverId');
  const server = await Server.findByPk(Number(serverId));
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 422 });
  return NextResponse.json(server.userBans ?? []);
}
