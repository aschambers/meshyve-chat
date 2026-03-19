import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/User';
import cloudinary from '@/lib/cloudinary';

export async function PUT(req: NextRequest) {
  const formData = await req.formData();
  const userId = Number(formData.get('userId'));
  const username = formData.get('username') as string | null;
  const email = formData.get('email') as string | null;
  const imageFile = formData.get('imageUrl') as File | null;

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

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
  });

  const { password: _, ...safe } = user.toJSON();
  return NextResponse.json(safe);
}
