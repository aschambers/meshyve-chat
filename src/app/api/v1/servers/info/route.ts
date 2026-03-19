import { NextRequest, NextResponse } from 'next/server';
import Server from '@/lib/models/Server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const serverId = Number(searchParams.get('serverId'));
  if (!serverId) return NextResponse.json({ error: 'Missing serverId' }, { status: 400 });
  const server = await Server.findByPk(serverId);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 });
  return NextResponse.json(server);
}
