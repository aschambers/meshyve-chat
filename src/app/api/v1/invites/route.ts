import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dayjs from 'dayjs';
import { Resend } from 'resend';
import Invite from '@/lib/models/Invite';
import Server from '@/lib/models/Server';
import User from '@/lib/models/User';
import { requireEnv } from '@/lib/env';

const resend = new Resend(requireEnv('RESEND_API_KEY'));

export async function GET(req: NextRequest) {
  const serverId = req.nextUrl.searchParams.get('serverId');
  const invites = await Invite.findAll({ where: { serverId: Number(serverId) } });
  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  const { expires, serverId, email } = await req.json();
  if (!expires || !serverId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const token = crypto.randomBytes(12).toString('hex');
  const code = 'invite-' + crypto.randomBytes(12).toString('hex');

  const result = await Invite.create({ token, code, expires, serverId, email: email ?? null });

  if (email) {
    const server = await Server.findByPk(serverId);
    if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 422 });

    await resend.emails.send({
      from: requireEnv('EMAIL_FROM'),
      to: email,
      subject: 'Invitation to join server',
      html: `You have been invited to join <strong>${server.name}</strong>. Use this code: <strong>${code}</strong>`,
    });
  }

  return NextResponse.json({ code: result.code });
}

export async function DELETE(req: NextRequest) {
  const { inviteId, serverId } = await req.json();
  if (!inviteId || !serverId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  await Invite.destroy({ where: { id: inviteId } });
  const invites = await Invite.findAll({ where: { serverId } });
  return NextResponse.json(invites);
}

export async function PUT(req: NextRequest) {
  const { userId, code, email } = await req.json();

  const invite = await Invite.findOne({ where: { code } });
  if (!invite) return NextResponse.json({ error: 'Invalid invite code' }, { status: 422 });

  if (dayjs().isAfter(dayjs(invite.updatedAt).add(invite.expires, 'hour'))) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 422 });
  }

  const server = await Server.findByPk(invite.serverId);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 422 });

  const user = await User.findOne({ where: { email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 422 });

  const bans = (server.userBans ?? []) as Record<string, unknown>[];
  if (bans.some(b => b.userId === userId)) {
    return NextResponse.json({ error: 'You are banned from this server' }, { status: 422 });
  }

  if (!user.serversList) user.serversList = [];
  const sList = user.serversList as Record<string, unknown>[];
  if (sList.some(s => s.serverId === server.id)) {
    return NextResponse.json({ error: 'You have already joined this server' }, { status: 422 });
  }

  sList.push({ serverId: server.id, name: server.name, imageUrl: server.imageUrl, region: server.region, active: true });
  user.changed('serversList', true);
  await user.save();

  if (!server.userList) server.userList = [];
  const uList = server.userList as Record<string, unknown>[];
  if (!uList.some(u => u.userId === user.id)) {
    uList.push({ userId: user.id, username: user.username, imageUrl: user.imageUrl, type: 'user', active: true });
    server.changed('userList', true);
    await server.save();
  }

  return NextResponse.json(user.serversList);
}
