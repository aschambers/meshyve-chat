import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/User';
import Server from '@/lib/models/Server';
import { getSessionFromRequest, cookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await User.findByPk(session.id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 422 });

  user.active = false;
  await user.save();

  const servers = await Server.findAll();
  for (const server of servers) {
    if (!server.userList) continue;
    let updated = false;
    const list = server.userList as Record<string, unknown>[];
    for (const u of list) {
      if (Number((u as Record<string, unknown>).userId) === user.id) {
        (u as Record<string, unknown>).active = false;
        updated = true;
      }
    }
    if (updated) {
      server.changed('userList', true);
      await server.save();
    }
  }

  const opts = cookieOptions();
  const res = NextResponse.json({ success: true });
  res.cookies.set(opts.name, '', { ...opts, maxAge: 0 });
  return res;
}
