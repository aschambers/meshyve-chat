import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import User from '@/lib/models/User';
import Server from '@/lib/models/Server';
import Chatroom from '@/lib/models/Chatroom';
import cloudinary from '@/lib/cloudinary';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');
  const user = await User.findByPk(Number(id));
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 422 });
  return NextResponse.json(user.serversList);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const name = formData.get('name') as string;
  const userId = Number(formData.get('userId'));
  const isPublic = formData.get('public') === 'true';
  const region = (formData.get('region') as string) || 'US West';
  const imageFile = formData.get('imageUrl') as File | null;

  if (!name || !userId || isPublic == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const existing = await Server.findOne({ where: { name } });
  if (existing) return NextResponse.json({ error: 'Server exists' }, { status: 400 });

  let imageUrl: string | undefined;
  if (imageFile && imageFile.size > 0) {
    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mime = imageFile.type;
    const result = await cloudinary.uploader.upload(`data:${mime};base64,${base64}`);
    imageUrl = result.url.replace(/^http:\/\//i, 'https://');
  }

  const newServer = await Server.create({ name, userId, public: isPublic, region, active: true, imageUrl: imageUrl ?? null, userList: [], userBans: null });

  const updateUser = await User.findByPk(userId);
  if (!updateUser) return NextResponse.json({ error: 'User not found' }, { status: 422 });

  if (!updateUser.serversList) updateUser.serversList = [];
  updateUser.serversList.push({ serverId: newServer.id, name, imageUrl, region, active: true });
  updateUser.changed('serversList', true);
  await updateUser.save();

  newServer.userList = [{ userId, username: updateUser.username, imageUrl: updateUser.imageUrl, type: 'owner', active: true }];
  newServer.changed('userList', true);
  await newServer.save();

  await Chatroom.create({ name: 'general', serverId: newServer.id, type: 'text', categoryId: null });

  return NextResponse.json(updateUser.serversList);
}

export async function DELETE(req: NextRequest) {
  const { userId, serverId } = await req.json();
  if (!userId || !serverId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  await Server.destroy({ where: { id: serverId } });
  const user = await User.findByPk(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 422 });

  if (!user.serversList) user.serversList = [];
  const idx = (user.serversList as Record<string, unknown>[]).findIndex((s) => s.serverId === serverId);
  if (idx > -1) user.serversList.splice(idx, 1);
  user.changed('serversList', true);
  await user.save();

  return NextResponse.json(user.serversList);
}
