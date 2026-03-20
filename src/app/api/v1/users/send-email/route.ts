import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Resend } from 'resend';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const user = await User.findOne({ where: { email } });
  if (!user) return NextResponse.json({ error: 'User does not exist' }, { status: 422 });

  const token = crypto.randomBytes(64).toString('hex');
  await user.update({ token });

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? '',
    to: email,
    subject: 'Verify your account',
    html: `Please click this link to verify your account. <br><a href="${process.env.NEXT_PUBLIC_BASE_URL}/verification?token=${token}&email=${email}">Verify account</a>`,
  });

  if (error) return NextResponse.json({ error: 'Failed to send email' }, { status: 422 });
  return NextResponse.json({ success: true });
}
