import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import User from '@/lib/models/User';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const user = await User.findOne({ where: { resetPasswordToken: token } });
  if (!user) return NextResponse.json({ error: 'Error resetting password' }, { status: 422 });

  if (dayjs().isAfter(dayjs(user.updatedAt).add(2, 'hour'))) {
    return NextResponse.json({ error: 'Reset link expired' }, { status: 422 });
  }

  user.password = password;
  await user.save({ fields: ['password'] });
  return NextResponse.json({ success: true });
}
