import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import Message from '@/lib/models/Message';

const ORDER: [string, string][] = [['createdAt', 'DESC']];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const chatroomId = searchParams.get('chatroomId');
  const userId = searchParams.get('userId');
  const friendId = searchParams.get('friendId');
  const personal = searchParams.get('personal');

  if (chatroomId) {
    const messages = await Message.findAll({ where: { chatroomId: Number(chatroomId) }, order: ORDER });
    return NextResponse.json(messages);
  }

  if (personal === 'true' && userId) {
    const messages = await Message.findAll({
      where: { [Op.and]: [{ chatroomId: null }, { userId: Number(userId) }, { friendId: Number(userId) }] },
      order: ORDER,
    });
    return NextResponse.json(messages);
  }

  if (userId && friendId) {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { [Op.and]: [{ userId: Number(userId) }, { friendId: Number(friendId) }, { chatroomId: null }] },
          { [Op.and]: [{ userId: Number(friendId) }, { friendId: Number(userId) }, { chatroomId: null }] },
        ],
      },
      order: ORDER,
    });
    return NextResponse.json(messages);
  }

  return NextResponse.json({ error: 'Missing query params' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, message, userId, chatroomId, friendId } = body;

  if (!username || !message || !userId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await Message.create({ username, message, userId, chatroomId: chatroomId ?? null, friendId: friendId ?? null });

  if (chatroomId) {
    const messages = await Message.findAll({ where: { chatroomId }, order: ORDER });
    return NextResponse.json(messages);
  }

  const uid = Number(userId);
  const fid = Number(friendId);
  const personal = uid === fid;

  if (personal) {
    const messages = await Message.findAll({
      where: { [Op.and]: [{ chatroomId: null }, { userId: uid }, { friendId: uid }] },
      order: ORDER,
    });
    return NextResponse.json(messages);
  }

  const messages = await Message.findAll({
    where: {
      [Op.or]: [
        { [Op.and]: [{ userId: uid }, { friendId: fid }, { chatroomId: null }] },
        { [Op.and]: [{ userId: fid }, { friendId: uid }, { chatroomId: null }] },
      ],
    },
    order: ORDER,
  });
  return NextResponse.json(messages);
}

export async function PUT(req: NextRequest) {
  const { messageId, message, chatroomId, userId, friendId } = await req.json();

  const msg = await Message.findByPk(messageId);
  if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 422 });
  await msg.update({ message });

  if (chatroomId) {
    const messages = await Message.findAll({ where: { chatroomId }, order: ORDER });
    return NextResponse.json(messages);
  }

  const uid = Number(userId);
  const fid = Number(friendId);
  const messages = await Message.findAll({
    where: {
      [Op.or]: [
        { [Op.and]: [{ userId: uid }, { friendId: fid }, { chatroomId: null }] },
        { [Op.and]: [{ userId: fid }, { friendId: uid }, { chatroomId: null }] },
      ],
    },
    order: ORDER,
  });
  return NextResponse.json(messages);
}

export async function DELETE(req: NextRequest) {
  const { messageId, chatroomId, userId, friendId } = await req.json();

  await Message.destroy({ where: { id: messageId } });

  if (chatroomId) {
    const messages = await Message.findAll({ where: { chatroomId }, order: ORDER });
    return NextResponse.json(messages);
  }

  const uid = Number(userId);
  const fid = Number(friendId);
  const messages = await Message.findAll({
    where: {
      [Op.or]: [
        { [Op.and]: [{ userId: uid }, { friendId: fid }, { chatroomId: null }] },
        { [Op.and]: [{ userId: fid }, { friendId: uid }, { chatroomId: null }] },
      ],
    },
    order: ORDER,
  });
  return NextResponse.json(messages);
}
