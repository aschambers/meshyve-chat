import { createServer } from 'http';
import { Server } from 'socket.io';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../src/lib/db';
import Message from '../src/lib/models/Message';
import ServerModel from '../src/lib/models/Server';
import Chatroom from '../src/lib/models/Chatroom';
import User from '../src/lib/models/User';
import '../src/lib/models/Friend';
import '../src/lib/models/Category';
import '../src/lib/models/Invite';
import FriendRequest from '../src/lib/models/FriendRequest';

interface ChatroomMsgData {
  socketId: string;
  chatroomId: number;
  serverId?: number;
  room: string;
  previousRoom: string;
  username: string;
  message: string;
  userId: number;
  messageId: number;
  nameColor?: string | null;
  forwardedFrom?: Record<string, unknown> | null;
}

interface UserMsgData {
  socketId: string;
  userId: number;
  friendId: number;
  room: string;
  previousRoom: string;
  username: string;
  message: string;
  messageId: number;
  nameColor?: string | null;
  forwardedFrom?: Record<string, unknown> | null;
}

interface ServerData {
  serverId: number;
  room: string;
}

type UserStatus = 'online' | 'away' | 'busy' | 'offline';

interface UserPresence {
  userId: number;
  username: string;
  status: UserStatus;
  socketId: string;
}

const PORT = Number(process.env.PORT ?? process.env.SOCKET_PORT ?? 3001);
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000', credentials: true },
  transports: ['websocket'],
});

const ORDER: [string, string][] = [['createdAt', 'DESC']];

// Active users list (in-memory, persists for lifetime of this process)
let users: UserPresence[] = [];

// Voice channel participants: chatroomId -> { username, socketId, room }[]
const voiceChannels = new Map<number, { username: string; socketId: string; room: string }[]>();

// Slowmode: last message timestamp per userId:chatroomId
const slowmodeTimestamps = new Map<string, number>();

sequelize.sync().then(async () => {
  await sequelize.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS "forwardedFrom" JSONB`);
  console.log('Socket server DB synced');

  async function getChatroomMessages(chatroomId: number, requestingUserId?: number) {
    const messages = await Message.findAll({ where: { chatroomId, parentId: null }, order: ORDER });
    const countRows = await sequelize.query<{ parentId: number; count: string }>(
      `SELECT "parentId", COUNT(*)::int AS count FROM messages WHERE "chatroomId" = :chatroomId AND "parentId" IS NOT NULL GROUP BY "parentId"`,
      { replacements: { chatroomId }, type: QueryTypes.SELECT }
    );
    const threadCounts: Record<number, number> = {};
    for (const row of countRows) {
      const parent = messages.find(m => m.id === row.parentId);
      // Private thread cards only visible to their creator
      if (parent?.isPrivate && requestingUserId !== undefined && parent.userId !== requestingUserId) continue;
      threadCounts[row.parentId] = Number(row.count);
    }
    return { messages, threadCounts };
  }

  io.on('connection', socket => {

    socket.on('LEAVE_CHATROOMS', ({ room }: { room: string }) => {
      socket.leave(room);
    });

    // ── Chatroom messages ────────────────────────────────────────────────
    socket.on('GET_CHATROOM_MESSAGES', async (data: ChatroomMsgData) => {
      // Reject if the chatroom is private and user is not admin/owner
      const chatroom = await Chatroom.findByPk(data.chatroomId);
      if (chatroom?.isPrivate) {
        const server = data.serverId ? await ServerModel.findByPk(data.serverId) : null;
        const userList = (server?.userList ?? []) as { userId: number; type: string }[];
        const member = userList.find(u => u.userId === data.userId);
        if (!member || !['owner', 'admin'].includes(member.type)) return;
      }

      socket.leave(data.previousRoom);
      socket.join(data.room);

      const { messages, threadCounts } = await getChatroomMessages(data.chatroomId, data.userId);
      io.to(data.socketId).emit('RECEIVE_CHATROOM_MESSAGES', messages);
      io.to(data.socketId).emit('RECEIVE_THREAD_COUNTS', threadCounts);

      if (data.serverId) {
        const server = await ServerModel.findByPk(data.serverId);
        if (server) io.in(data.room).emit('RECEIVE_SERVER_LIST', server.userList ?? []);
      }

      socket.emit('RECEIVE_USERS', users);
    });

    socket.on('CHATROOM_MESSAGE', async (data: ChatroomMsgData) => {
      const chatroom = await Chatroom.findByPk(data.chatroomId);
      const slowmode = chatroom?.slowmode ?? 0;

      if (slowmode > 0) {
        const key = `${data.userId}:${data.chatroomId}`;
        const last = slowmodeTimestamps.get(key) ?? 0;
        const remaining = Math.ceil(slowmode - (Date.now() - last) / 1000);
        if (remaining > 0) {
          socket.emit('SLOWMODE_ERROR', { remaining });
          return;
        }
        slowmodeTimestamps.set(key, Date.now());
      }

      try {
        await Message.create({
          username: data.username,
          message: data.message,
          userId: data.userId,
          chatroomId: data.chatroomId,
          friendId: null,
          nameColor: data.nameColor ?? null,
          forwardedFrom: data.forwardedFrom ?? null,
        });
      } catch (err: unknown) {
        console.error('CHATROOM_MESSAGE create error:', err);
        // Column may not exist yet — retry without forwardedFrom
        await Message.create({
          username: data.username,
          message: data.message,
          userId: data.userId,
          chatroomId: data.chatroomId,
          friendId: null,
          nameColor: data.nameColor ?? null,
        });
      }
      const { messages, threadCounts } = await getChatroomMessages(data.chatroomId);
      io.in(data.room).emit('RECEIVE_CHATROOM_MESSAGES', messages);
      io.in(data.room).emit('RECEIVE_THREAD_COUNTS', threadCounts);
    });

    socket.on('REACT_CHATROOM_MESSAGE', async ({ messageId, emoji, userId, chatroomId, room }: { messageId: number; emoji: string; userId: number; chatroomId: number; room: string }) => {
      const msg = await Message.findByPk(messageId);
      if (!msg) return;
      const reactions = { ...((msg.reactions ?? {}) as Record<string, number[]>) };
      const users = reactions[emoji] ?? [];
      if (users.includes(userId)) {
        const filtered = users.filter((id: number) => id !== userId);
        if (filtered.length === 0) delete reactions[emoji];
        else reactions[emoji] = filtered;
      } else {
        reactions[emoji] = [...users, userId];
      }
      await msg.update({ reactions });
      msg.changed('reactions', true);
      const { messages, threadCounts } = await getChatroomMessages(chatroomId);
      io.in(room).emit('RECEIVE_CHATROOM_MESSAGES', messages);
      io.in(room).emit('RECEIVE_THREAD_COUNTS', threadCounts);
    });

    socket.on('DELETE_CHATROOM_MESSAGE', async (data: ChatroomMsgData) => {
      await Message.destroy({ where: { id: data.messageId } });
      const { messages, threadCounts } = await getChatroomMessages(data.chatroomId);
      io.in(data.room).emit('RECEIVE_CHATROOM_MESSAGES', messages);
      io.in(data.room).emit('RECEIVE_THREAD_COUNTS', threadCounts);
    });

    socket.on('EDIT_CHATROOM_MESSAGE', async (data: ChatroomMsgData) => {
      const msg = await Message.findByPk(data.messageId);
      if (msg) await msg.update({ message: data.message });
      const { messages, threadCounts } = await getChatroomMessages(data.chatroomId);
      io.in(data.room).emit('RECEIVE_CHATROOM_MESSAGES', messages);
      io.in(data.room).emit('RECEIVE_THREAD_COUNTS', threadCounts);
    });

    socket.on('GET_THREAD_MESSAGES', async ({ parentId, room, userId }: { parentId: number; room: string; socketId: string; userId?: number }) => {
      const parent = await Message.findByPk(parentId);
      if (parent?.isPrivate && userId !== undefined && parent.userId !== userId) return;
      socket.join(room);
      const messages = await Message.findAll({ where: { parentId }, order: ORDER });
      socket.emit('RECEIVE_THREAD_MESSAGES', messages);
    });

    socket.on('SEND_THREAD_MESSAGE', async ({ parentId, chatroomId, username, message, userId, nameColor, room, chatroomRoom }: { parentId: number; chatroomId: number; username: string; message: string; userId: number; nameColor: string | null; room: string; chatroomRoom: string }) => {
      await Message.create({ username, message, userId, chatroomId, friendId: null, nameColor: nameColor ?? null, parentId });
      const threadMessages = await Message.findAll({ where: { parentId }, order: ORDER });
      socket.emit('RECEIVE_THREAD_MESSAGES', threadMessages);
      socket.to(room).emit('RECEIVE_THREAD_MESSAGES', threadMessages);
      const { threadCounts } = await getChatroomMessages(chatroomId);
      io.in(chatroomRoom).emit('RECEIVE_THREAD_COUNTS', threadCounts);
    });

    socket.on('DELETE_THREAD_MESSAGE', async ({ messageId, parentId, chatroomId, room, chatroomRoom }: { messageId: number; parentId: number; chatroomId: number; room: string; chatroomRoom: string }) => {
      await Message.destroy({ where: { id: messageId } });
      const threadMessages = await Message.findAll({ where: { parentId }, order: ORDER });
      socket.emit('RECEIVE_THREAD_MESSAGES', threadMessages);
      socket.to(room).emit('RECEIVE_THREAD_MESSAGES', threadMessages);
      const { threadCounts } = await getChatroomMessages(chatroomId);
      io.in(chatroomRoom).emit('RECEIVE_THREAD_COUNTS', threadCounts);
    });

    socket.on('EDIT_THREAD_MESSAGE', async ({ messageId, message, parentId, room }: { messageId: number; message: string; parentId: number; room: string }) => {
      const msg = await Message.findByPk(messageId);
      if (msg) await msg.update({ message });
      const threadMessages = await Message.findAll({ where: { parentId }, order: ORDER });
      socket.emit('RECEIVE_THREAD_MESSAGES', threadMessages);
      socket.to(room).emit('RECEIVE_THREAD_MESSAGES', threadMessages);
    });

    socket.on('CREATE_THREAD', async (
      data: { username: string; message: string; userId: number; chatroomId: number; room: string; nameColor?: string | null; isPrivate?: boolean },
      callback: (msg: unknown) => void
    ) => {
      const newMsg = await Message.create({
        username: data.username,
        message: data.message,
        userId: data.userId,
        chatroomId: data.chatroomId,
        friendId: null,
        nameColor: data.nameColor ?? null,
        isPrivate: data.isPrivate ?? false,
      });
      const { messages, threadCounts } = await getChatroomMessages(data.chatroomId);
      io.in(data.room).emit('RECEIVE_CHATROOM_MESSAGES', messages);
      io.in(data.room).emit('RECEIVE_THREAD_COUNTS', threadCounts);
      if (typeof callback === 'function') callback(newMsg.toJSON());
    });

    socket.on('PIN_MESSAGE', async ({ messageId, chatroomId, room }: { messageId: number; chatroomId: number; room: string }) => {
      const msg = await Message.findByPk(messageId);
      if (!msg) return;
      await msg.update({ isPinned: !msg.isPinned });
      const { messages, threadCounts } = await getChatroomMessages(chatroomId);
      io.in(room).emit('RECEIVE_CHATROOM_MESSAGES', messages);
      io.in(room).emit('RECEIVE_THREAD_COUNTS', threadCounts);
    });

    // ── Personal messages (user messaging themselves) ────────────────────
    socket.on('GET_PERSONAL_MESSAGES', async (data: UserMsgData) => {
      socket.leave(data.previousRoom);
      socket.join(data.room);
      const uid = data.userId;
      const messages = await Message.findAll({
        where: { [Op.and]: [{ chatroomId: null }, { userId: uid }, { friendId: uid }] },
        order: ORDER,
      });
      io.to(data.socketId).emit('RECEIVE_PERSONAL_MESSAGES', messages);
    });

    socket.on('SEND_PERSONAL_MESSAGE', async (data: UserMsgData) => {
      const uid = data.userId;
      await Message.create({ username: data.username, message: data.message, userId: uid, friendId: uid, chatroomId: null, nameColor: data.nameColor ?? null });
      const messages = await Message.findAll({
        where: { [Op.and]: [{ chatroomId: null }, { userId: uid }, { friendId: uid }] },
        order: ORDER,
      });
      io.in(data.room).emit('RECEIVE_PERSONAL_MESSAGES', messages);
    });

    // ── Private messages (between two users) ─────────────────────────────
    socket.on('GET_PRIVATE_MESSAGES', async (data: UserMsgData) => {
      socket.leave(data.previousRoom);
      socket.join(data.room);
      const uid = data.userId;
      const fid = data.friendId;
      const messages = await Message.findAll({
        where: {
          [Op.or]: [
            { [Op.and]: [{ userId: uid }, { friendId: fid }, { chatroomId: null }] },
            { [Op.and]: [{ userId: fid }, { friendId: uid }, { chatroomId: null }] },
          ],
        },
        order: ORDER,
      });
      io.to(data.socketId).emit('RECEIVE_PRIVATE_MESSAGES', messages);
    });

    socket.on('SEND_PRIVATE_MESSAGE', async (data: UserMsgData) => {
      const uid = data.userId;
      const fid = data.friendId;
      try {
        await Message.create({ username: data.username, message: data.message, userId: uid, friendId: fid, chatroomId: null, nameColor: data.nameColor ?? null, forwardedFrom: data.forwardedFrom ?? null });
      } catch (err: unknown) {
        console.error('SEND_PRIVATE_MESSAGE create error:', err);
        await Message.create({ username: data.username, message: data.message, userId: uid, friendId: fid, chatroomId: null, nameColor: data.nameColor ?? null });
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
      io.in(data.room).emit('RECEIVE_PRIVATE_MESSAGES', messages);
    });

    socket.on('REACT_USER_MESSAGE', async ({ messageId, emoji, userId, friendId, isSelf, room, socketId }: { messageId: number; emoji: string; userId: number; friendId: number; isSelf: boolean; room: string; socketId: string }) => {
      const msg = await Message.findByPk(messageId);
      if (!msg) return;
      const reactions = { ...((msg.reactions ?? {}) as Record<string, number[]>) };
      const users = reactions[emoji] ?? [];
      if (users.includes(userId)) {
        const filtered = users.filter((id: number) => id !== userId);
        if (filtered.length === 0) delete reactions[emoji];
        else reactions[emoji] = filtered;
      } else {
        reactions[emoji] = [...users, userId];
      }
      await msg.update({ reactions });
      msg.changed('reactions', true);
      const uid = userId;
      const fid = friendId;
      if (isSelf) {
        const messages = await Message.findAll({ where: { [Op.and]: [{ chatroomId: null }, { userId: uid }, { friendId: uid }] }, order: ORDER });
        io.in(room).emit('RECEIVE_PERSONAL_MESSAGES', messages);
      } else {
        const messages = await Message.findAll({
          where: { [Op.or]: [{ [Op.and]: [{ userId: uid }, { friendId: fid }, { chatroomId: null }] }, { [Op.and]: [{ userId: fid }, { friendId: uid }, { chatroomId: null }] }] },
          order: ORDER,
        });
        io.in(room).emit('RECEIVE_PRIVATE_MESSAGES', messages);
      }
    });

    socket.on('DELETE_USER_MESSAGE', async (data: UserMsgData) => {
      const uid = data.userId;
      const fid = data.friendId;
      await Message.destroy({ where: { id: data.messageId } });

      if (uid === fid) {
        const messages = await Message.findAll({ where: { [Op.and]: [{ chatroomId: null }, { userId: uid }, { friendId: uid }] }, order: ORDER });
        io.to(data.socketId).emit('RECEIVE_PERSONAL_MESSAGES', messages);
      } else {
        const messages = await Message.findAll({
          where: { [Op.or]: [{ [Op.and]: [{ userId: uid }, { friendId: fid }, { chatroomId: null }] }, { [Op.and]: [{ userId: fid }, { friendId: uid }, { chatroomId: null }] }] },
          order: ORDER,
        });
        io.to(data.socketId).emit('RECEIVE_PRIVATE_MESSAGES', messages);
      }
    });

    socket.on('EDIT_USER_MESSAGE', async (data: UserMsgData) => {
      const uid = data.userId;
      const fid = data.friendId;
      const msg = await Message.findByPk(data.messageId);
      if (msg) await msg.update({ message: data.message });

      if (uid === fid) {
        const messages = await Message.findAll({ where: { [Op.and]: [{ chatroomId: null }, { userId: uid }, { friendId: uid }] }, order: ORDER });
        io.in(data.room).emit('RECEIVE_PERSONAL_MESSAGES', messages);
      } else {
        const messages = await Message.findAll({
          where: { [Op.or]: [{ [Op.and]: [{ userId: uid }, { friendId: fid }, { chatroomId: null }] }, { [Op.and]: [{ userId: fid }, { friendId: uid }, { chatroomId: null }] }] },
          order: ORDER,
        });
        io.in(data.room).emit('RECEIVE_PRIVATE_MESSAGES', messages);
      }
    });

    // ── Server management ────────────────────────────────────────────────
    socket.on('REFRESH_SERVER_LIST', async (data: ServerData) => {
      const server = await ServerModel.findByPk(data.serverId);
      if (server) io.in(data.room).emit('RECEIVE_SERVER_LIST', server.userList ?? []);
    });

    socket.on('KICK_SERVER_USER', async (data: ServerData & { userId: number }) => {
      const [user, server] = await Promise.all([User.findByPk(data.userId), ServerModel.findByPk(data.serverId)]);
      if (!user || !server) return;

      const sList = user.serversList as Record<string, unknown>[];
      const sIdx = sList.findIndex(s => s.serverId === data.serverId);
      if (sIdx > -1) sList.splice(sIdx, 1);
      user.changed('serversList', true);
      await user.save();

      const uList = server.userList as Record<string, unknown>[];
      const uIdx = uList.findIndex(u => u.userId === data.userId);
      if (uIdx > -1) uList.splice(uIdx, 1);
      server.changed('userList', true);
      await server.save();

      io.in(data.room).emit('RECEIVE_SERVER_LIST', server.userList ?? []);
      const target = users.find(u => u.userId === data.userId);
      if (target) io.to(target.socketId).emit('FORCE_HOME');
    });

    socket.on('BAN_SERVER_USER', async (data: ServerData & { userId: number }) => {
      const [user, server] = await Promise.all([User.findByPk(data.userId), ServerModel.findByPk(data.serverId)]);
      if (!user || !server) return;

      const sList = user.serversList as Record<string, unknown>[];
      const sIdx = sList.findIndex(s => s.serverId === data.serverId);
      if (sIdx > -1) sList.splice(sIdx, 1);
      user.changed('serversList', true);
      await user.save();

      const uList = server.userList as Record<string, unknown>[];
      const uIdx = uList.findIndex(u => u.userId === data.userId);
      if (uIdx > -1) uList.splice(uIdx, 1);

      if (!server.userBans) server.userBans = [];
      (server.userBans as Record<string, unknown>[]).push({
        userId: data.userId, username: user.username, imageUrl: user.imageUrl ?? null, type: user.type,
      });

      server.changed('userList', true);
      server.changed('userBans', true);
      await server.save();

      io.in(data.room).emit('RECEIVE_SERVER_LIST', server.userList ?? []);
      const target = users.find(u => u.userId === data.userId);
      if (target) io.to(target.socketId).emit('FORCE_HOME');
    });

    // ── WebRTC signalling ─────────────────────────────────────────────────
    socket.on('SEND_ICE_CANDIDATE', (data: { room: string }) => socket.to(data.room).emit('RECEIVE_ICE_CANDIDATE', data));
    socket.on('SEND_OFFER', (data: { room: string }) => socket.to(data.room).emit('RECEIVE_OFFER', data));
    socket.on('SEND_ANSWER', (data: { room: string }) => socket.to(data.room).emit('RECEIVE_ANSWER', data));

    // ── Voice channels ────────────────────────────────────────────────────
    socket.on('JOIN_VOICE', ({ username, chatroomId, room }: { username: string; chatroomId: number; room: string }) => {
      // Deduplicate: remove any stale entry for this user before adding
      const users = (voiceChannels.get(chatroomId) ?? []).filter(u => u.username !== username);
      socket.emit('VOICE_USERS', users.map(u => u.username));
      users.push({ username, socketId: socket.id, room });
      voiceChannels.set(chatroomId, users);
      socket.join(room);
      socket.to(room).emit('VOICE_USER_JOINED', { username });
      io.emit('VOICE_STATE_CHANGED', { chatroomId, users: users.map(u => u.username) });
    });

    socket.on('LEAVE_VOICE', ({ username, chatroomId, room }: { username: string; chatroomId: number; room: string }) => {
      const remaining = (voiceChannels.get(chatroomId) ?? []).filter(u => u.socketId !== socket.id);
      voiceChannels.set(chatroomId, remaining);
      socket.leave(room);
      socket.to(room).emit('VOICE_USER_LEFT', { username });
      io.emit('VOICE_STATE_CHANGED', { chatroomId, users: remaining.map(u => u.username) });
    });

    socket.on('GET_VOICE_PARTICIPANTS', ({ chatroomIds }: { chatroomIds: number[] }) => {
      const result: Record<number, string[]> = {};
      for (const cid of chatroomIds) {
        result[cid] = (voiceChannels.get(cid) ?? []).map(u => u.username);
      }
      socket.emit('VOICE_PARTICIPANTS', result);
    });

    socket.on('VOICE_OFFER', ({ to, from, desc, chatroomId }: { to: string; from: string; desc: RTCSessionDescriptionInit; chatroomId: number }) => {
      const target = (voiceChannels.get(chatroomId) ?? []).find(u => u.username === to);
      if (target) io.to(target.socketId).emit('VOICE_OFFER', { from, desc });
    });

    socket.on('VOICE_ANSWER', ({ to, from, desc, chatroomId }: { to: string; from: string; desc: RTCSessionDescriptionInit; chatroomId: number }) => {
      const target = (voiceChannels.get(chatroomId) ?? []).find(u => u.username === to);
      if (target) io.to(target.socketId).emit('VOICE_ANSWER', { from, desc });
    });

    socket.on('VOICE_ICE', ({ to, from, candidate, chatroomId }: { to: string; from: string; candidate: RTCIceCandidateInit; chatroomId: number }) => {
      const target = (voiceChannels.get(chatroomId) ?? []).find(u => u.username === to);
      if (target) io.to(target.socketId).emit('VOICE_ICE', { from, candidate });
    });

    socket.on('VOICE_DEAFEN', ({ username, chatroomId, deafened }: { username: string; chatroomId: number; deafened: boolean }) => {
      const room = (voiceChannels.get(chatroomId) ?? []).find(u => u.username === username)?.room;
      if (room) socket.to(room).emit('VOICE_DEAFEN', { username, deafened });
    });

    socket.on('disconnect', () => {
      voiceChannels.forEach((channelUsers, chatroomId) => {
        // Clean up by both socketId AND username to catch stale entries
        const user = channelUsers.find(u => u.socketId === socket.id);
        if (user) {
          const remaining = channelUsers.filter(u => u.socketId !== socket.id);
          voiceChannels.set(chatroomId, remaining);
          io.to(user.room).emit('VOICE_USER_LEFT', { username: user.username });
          io.emit('VOICE_STATE_CHANGED', { chatroomId, users: remaining.map(u => u.username) });
        }
      });
    });

    // ── Online user presence ──────────────────────────────────────────────
    socket.on('SEND_USER', (data: { userId: number; username: string; status?: UserStatus; active?: boolean }) => {
      const status: UserStatus = data.status ?? (data.active ? 'online' : 'offline');
      const existing = users.find(u => u.username === data.username);
      if (!existing) {
        users.push({ userId: data.userId, username: data.username, status, socketId: socket.id });
      } else {
        existing.status = status;
        existing.socketId = socket.id;
      }
      io.emit('RECEIVE_USERS', users);
    });

    socket.on('SET_STATUS', (data: { username: string; status: UserStatus }) => {
      const user = users.find(u => u.username === data.username);
      if (user) user.status = data.status;
      io.emit('RECEIVE_USERS', users);
    });

    socket.on('LOGOUT_USER', (data: { username: string }) => {
      const user = users.find(u => u.username === data.username);
      if (user) user.status = 'offline';
      io.emit('RECEIVE_USERS', users);
    });

    socket.on('GET_USERS', () => {
      socket.emit('RECEIVE_USERS', users);
    });

    // ── Friend requests ───────────────────────────────────────────────────
    socket.on('SEND_FRIEND_REQUEST', async ({ requestId }: { requestId: number }) => {
      const request = await FriendRequest.findByPk(requestId);
      if (!request) return;
      const target = users.find(u => u.userId === request.receiverId);
      if (target) io.to(target.socketId).emit('RECEIVE_FRIEND_REQUEST', request.toJSON());
    });

    socket.on('FRIEND_REQUEST_ACCEPTED', async ({ requestId }: { requestId: number }) => {
      const request = await FriendRequest.findByPk(requestId);
      if (!request) return;
      const target = users.find(u => u.userId === request.senderId);
      if (target) io.to(target.socketId).emit('FRIEND_REQUEST_ACCEPTED', { requestId, receiverUsername: request.receiverUsername });
    });

    socket.on('FRIEND_REMOVED', ({ userId, friendId }: { userId: number; friendId: number }) => {
      const target = users.find(u => u.userId === friendId);
      if (target) io.to(target.socketId).emit('FRIEND_REMOVED', { userId });
    });
  });

  httpServer.listen(PORT, () => console.log(`Socket.io server listening on port ${PORT}`));
});
