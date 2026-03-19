import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import Chatroom from '@/lib/models/Chatroom';
import sequelize from '@/lib/db';

async function ensurePositionColumn() {
  await sequelize.query(
    `ALTER TABLE chatrooms ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0`
  );
}

function sortByPosition(chatrooms: Chatroom[]) {
  return [...chatrooms].sort((a, b) => {
    const pa = a.position ?? 999999;
    const pb = b.position ?? 999999;
    return pa !== pb ? pa - pb : a.id - b.id;
  });
}

export async function GET(req: NextRequest) {
  const serverId = req.nextUrl.searchParams.get('serverId');
  try {
    const chatrooms = await Chatroom.findAll({ where: { serverId: Number(serverId) } });
    return NextResponse.json(sortByPosition(chatrooms));
  } catch (e: any) {
    if (e?.original?.code === '42703') {
      await ensurePositionColumn();
      const chatrooms = await Chatroom.findAll({ where: { serverId: Number(serverId) } });
      return NextResponse.json(sortByPosition(chatrooms));
    }
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const { name, serverId } = await req.json();
  if (!name || !serverId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const existing = await Chatroom.findOne({ where: { [Op.and]: [{ serverId }, { name }] } });
  if (existing) return NextResponse.json({ error: 'Chatroom exists' }, { status: 422 });

  const count = await Chatroom.count({ where: { serverId } });
  await Chatroom.create({ name, serverId, type: 'text', categoryId: null, position: count });
  const all = await Chatroom.findAll({ where: { serverId } });
  return NextResponse.json(sortByPosition(all));
}

export async function DELETE(req: NextRequest) {
  const { chatroomId } = await req.json();
  const deleted = await Chatroom.destroy({ where: { id: chatroomId } });
  if (!deleted) return NextResponse.json({ error: 'Error deleting chatroom' }, { status: 422 });
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const { chatroomId, categoryId } = await req.json();
  if (!chatroomId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const chatroom = await Chatroom.findByPk(chatroomId);
  if (!chatroom) return NextResponse.json({ error: 'Chatroom not found' }, { status: 422 });

  await chatroom.update({ categoryId });
  return NextResponse.json(chatroom);
}

// Reorder chatrooms: accepts { chatroomIds: number[] } in desired order
export async function PATCH(req: NextRequest) {
  const { chatroomIds } = await req.json();
  if (!Array.isArray(chatroomIds) || chatroomIds.length === 0) {
    return NextResponse.json({ error: 'Invalid chatroomIds' }, { status: 400 });
  }

  await Promise.all(
    chatroomIds.map((id: number, idx: number) => Chatroom.update({ position: idx }, { where: { id } }))
  );

  const first = await Chatroom.findByPk(chatroomIds[0]);
  if (!first) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const all = await Chatroom.findAll({ where: { serverId: first.serverId } });
  return NextResponse.json(sortByPosition(all));
}
