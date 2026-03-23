import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/User';
import Server from '@/lib/models/Server';
import cloudinary from '@/lib/cloudinary';
import { signToken, cookieOptions } from '@/lib/auth';
import sequelize from '@/lib/db';

export const dynamic = 'force-dynamic';

async function ensureColumns() {
  await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "nameColor" VARCHAR(255)`);
  await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "description" TEXT`);
}

export async function PUT(req: NextRequest) {
  const formData = await req.formData();
  const userId = Number(formData.get('userId'));
  const username = formData.get('username') as string | null;
  const email = formData.get('email') as string | null;
  const imageFile = formData.get('imageUrl') as File | null;
  const nameColor = formData.get('nameColor') as string | null;
  const description = formData.get('description') as string | null;

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  await ensureColumns();
  if (username && username.length > 30) return NextResponse.json({ error: 'Username too long' }, { status: 400 });

  const user = await User.findByPk(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 422 });

  let imageUrl: string | undefined;
  if (imageFile && imageFile.size > 0) {
    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const result = await cloudinary.uploader.upload(`data:${imageFile.type};base64,${base64}`);
    imageUrl = result.url.replace(/^http:\/\//i, 'https://');
  }

  await user.update({
    ...(username ? { username } : {}),
    ...(email ? { email } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(nameColor !== null ? { nameColor: nameColor || null } : {}),
    ...(description !== null ? { description: description || null } : {}),
  });
  await user.reload();

  // Sync updated imageUrl/username/nameColor into each server's userList
  if (imageUrl || username || nameColor !== null) {
    const serversList = (user.serversList ?? []) as { serverId: number }[];
    for (const s of serversList) {
      const server = await Server.findByPk(s.serverId);
      if (!server) continue;
      const list = server.userList as Record<string, unknown>[];
      const idx = list.findIndex(u => u.userId === userId);
      if (idx >= 0) {
        if (imageUrl) list[idx].imageUrl = imageUrl;
        if (username) list[idx].username = username;
        if (nameColor !== null) list[idx].nameColor = nameColor || null;
        server.changed('userList', true);
        await server.save();
      }
    }
  }

  const { password: _, ...safe } = user.toJSON();
  const token = await signToken({
    id: user.id,
    username: user.username,
    email: user.email,
    imageUrl: user.imageUrl,
    active: user.active,
    type: user.type,
    isVerified: user.isVerified,
    nameColor: user.nameColor,
  });
  const opts = cookieOptions();
  const res = NextResponse.json(safe);
  res.cookies.set(opts.name, token, opts);
  return res;
}
