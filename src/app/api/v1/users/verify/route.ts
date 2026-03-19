import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import dayjs from 'dayjs';
import User from '@/lib/models/User';

export async function PUT(req: NextRequest) {
  const { email, token } = await req.json();

  const alreadyVerified = await User.findOne({ where: { [Op.and]: [{ email }, { isVerified: true }] } });
  if (alreadyVerified) return NextResponse.json({ already: true });

  const user = await User.findOne({ where: { [Op.and]: [{ email }, { token }] } });
  if (!user) return NextResponse.json({ error: 'Error verifying account' }, { status: 422 });

  if (dayjs().isAfter(dayjs(user.updatedAt).add(2, 'hour'))) {
    return NextResponse.json({ error: 'Verification link expired' }, { status: 422 });
  }

  await user.update({ isVerified: true });
  return NextResponse.json({ success: true });
}
