import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import crypto from 'crypto';
import { Resend } from 'resend';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { username, password, email } = await req.json();
    if (!username || !password || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } });
    if (existing) return NextResponse.json({ error: 'User exists' }, { status: 422 });

    const token = crypto.randomBytes(64).toString('hex');
    const result = await User.create({ username, password, email, token, isVerified: false, active: false, type: 'user' });
    if (!result) return NextResponse.json({ error: 'Unknown error creating user' }, { status: 422 });

    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? '',
        to: email,
        subject: 'Verify your account',
        html: `Please click this link to verify your account. <br><a href="${process.env.NEXT_PUBLIC_BASE_URL}/verification?token=${token}&email=${email}">Verify account</a>`,
      });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
    }

    const { password: _, ...safeUser } = result.toJSON();
    return NextResponse.json(safeUser);
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
