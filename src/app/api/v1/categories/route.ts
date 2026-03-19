import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import Category from '@/lib/models/Category';

export async function GET(req: NextRequest) {
  const serverId = req.nextUrl.searchParams.get('serverId');
  if (!serverId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  const categories = await Category.findAll({ where: { serverId: Number(serverId) } });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const { name, serverId, order, visible } = await req.json();
  if (!name || !serverId || !order || visible === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const existing = await Category.findOne({ where: { [Op.and]: [{ serverId }, { name }] } });
  if (existing) return NextResponse.json({ error: 'Category exists' }, { status: 422 });

  await Category.create({ name, serverId, order, visible });
  const all = await Category.findAll({ where: { serverId } });
  return NextResponse.json(all);
}
