import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import crypto from 'crypto';
import Friend from '@/lib/models/Friend';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  const friends = await Friend.findAll({ where: { userId: Number(userId) } });
  return NextResponse.json(friends);
}

export async function POST(req: NextRequest) {
  const { username, friendUsername, userId, friendId, imageUrl } = await req.json();
  if (!username || !friendUsername || !userId || !friendId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const groupId = crypto.randomBytes(32).toString('hex');

  const friendFinder = await Friend.findOne({ where: { [Op.and]: [{ userId }, { friendId }] } });
  if (!friendFinder) {
    await Friend.create({ username, imageUrl, userId, friendId, activeFriend: true, groupId, isFriend: false });
  } else {
    await friendFinder.update({ activeFriend: true }, { where: { id: friendFinder.id } });
  }

  const userFinder = await Friend.findOne({ where: { [Op.and]: [{ userId: friendId }, { friendId: userId }] } });
  if (!userFinder) {
    await Friend.create({ username: friendUsername, imageUrl, userId: friendId, friendId: userId, activeFriend: true, groupId, isFriend: false });
  } else {
    await userFinder.update({ activeFriend: true }, { where: { id: userFinder.id } });
  }

  const friends = await Friend.findAll({ where: { userId } });
  return NextResponse.json(friends);
}

export async function PATCH(req: NextRequest) {
  const { userId, friendId } = await req.json();
  if (!userId || !friendId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  // Clear isFriend on both sides
  await Friend.update({ isFriend: false }, { where: { userId: Number(userId), friendId: Number(friendId) } });
  await Friend.update({ isFriend: false }, { where: { userId: Number(friendId), friendId: Number(userId) } });

  // Reset friend request so they can re-add each other later
  const { Op } = await import('sequelize');
  const FriendRequest = (await import('@/lib/models/FriendRequest')).default;
  await FriendRequest.update(
    { status: 'removed' },
    {
      where: {
        status: 'accepted',
        [Op.or]: [
          { senderId: Number(userId), receiverId: Number(friendId) },
          { senderId: Number(friendId), receiverId: Number(userId) },
        ],
      },
    }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { userId, friendId } = await req.json();
  if (!userId || !friendId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const friend = await Friend.findOne({ where: { [Op.and]: [{ userId }, { friendId }] } });
  if (!friend) return NextResponse.json({ error: 'Friend not found' }, { status: 422 });

  await friend.update({ activeFriend: false }, { where: { id: friend.id } });

  const friends = await Friend.findAll({ where: { userId } });
  return NextResponse.json(friends);
}
