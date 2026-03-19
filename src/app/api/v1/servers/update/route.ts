import { NextRequest, NextResponse } from 'next/server';
import Server from '@/lib/models/Server';
import User from '@/lib/models/User';
import cloudinary from '@/lib/cloudinary';

export async function PUT(req: NextRequest) {
  const formData = await req.formData();
  const serverId = Number(formData.get('serverId'));
  const userId = Number(formData.get('userId'));
  const name = formData.get('name') as string | null;
  const isPublicRaw = formData.get('public');
  const region = formData.get('region') as string | null;
  const imageFile = formData.get('imageUrl') as File | null;

  if (!serverId || !userId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const server = await Server.findByPk(serverId);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 });
  if (server.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let imageUrl: string | undefined;
  if (imageFile && imageFile.size > 0) {
    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const result = await cloudinary.uploader.upload(`data:${imageFile.type};base64,${base64}`);
    imageUrl = result.url.replace(/^http:\/\//i, 'https://');
  }

  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (isPublicRaw !== null && isPublicRaw !== '') updates.public = isPublicRaw === 'true';
  if (region) updates.region = region;
  if (imageUrl) updates.imageUrl = imageUrl;

  await server.update(updates);

  // Keep the user's cached serversList in sync
  const user = await User.findByPk(userId);
  if (user?.serversList) {
    const list = user.serversList as Record<string, unknown>[];
    const idx = list.findIndex(s => s.serverId === serverId);
    if (idx > -1) {
      if (name) list[idx].name = name;
      if (imageUrl) list[idx].imageUrl = imageUrl;
      user.changed('serversList', true);
      await user.save();
    }
  }

  return NextResponse.json(server);
}
