import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import User from '@/lib/models/User';
import Server from '@/lib/models/Server';
import { signToken, cookieOptions, JWTPayload } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const user = await User.findOne({ where: { email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 422 });
  if (!user.isVerified) return NextResponse.json({ error: 'Account not verified' }, { status: 400 });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return NextResponse.json({ error: 'Invalid password' }, { status: 422 });

  // mark user active
  user.active = true;
  await user.save();

  // update active status in all servers this user belongs to
  const servers = await Server.findAll();
  for (const server of servers) {
    if (!server.userList) continue;
    let updated = false;
    const list = server.userList as Record<string, unknown>[];
    for (const u of list) {
      if (Number((u as Record<string, unknown>).userId) === user.id) {
        (u as Record<string, unknown>).active = true;
        updated = true;
      }
    }
    if (updated) {
      server.changed('userList', true);
      await server.save();
    }
  }

  const payload: JWTPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    imageUrl: user.imageUrl,
    active: true,
    type: user.type,
    isVerified: user.isVerified,
  };

  const token = await signToken(payload);
  const opts = cookieOptions();

  const res = NextResponse.json(payload);
  res.cookies.set(opts.name, token, opts);
  return res;
}
