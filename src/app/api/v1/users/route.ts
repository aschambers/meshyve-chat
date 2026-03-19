import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/User';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const userId = searchParams.get('userId');

  if (userId) {
    const user = await User.findByPk(Number(userId));
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 422 });
    const { password: _, ...safe } = user.toJSON();
    return NextResponse.json(safe);
  }

  const users = await User.findAll({ attributes: { exclude: ['password'] } });
  return NextResponse.json(users);
}

export async function DELETE(req: NextRequest) {
  const { userId } = await req.json();
  const deleted = await User.destroy({ where: { id: userId } });
  if (!deleted) return NextResponse.json({ error: 'Error deleting user' }, { status: 422 });
  const users = await User.findAll({ attributes: { exclude: ['password'] } });
  return NextResponse.json(users);
}
