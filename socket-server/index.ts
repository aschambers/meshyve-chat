import { createServer } from 'http';
import { Server } from 'socket.io';
import { Op } from 'sequelize';
import sequelize from '../src/lib/db';
import Message from '../src/lib/models/Message';
import ServerModel from '../src/lib/models/Server';

// Bootstrap models
import '../src/lib/models/User';
import '../src/lib/models/Friend';
import '../src/lib/models/Chatroom';
import '../src/lib/models/Category';
import '../src/lib/models/Invite';

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
}

interface ServerData {
  serverId: number;
  room: string;
}

interface UserPresence {
  userId: number;
  username: string;
  active: boolean;
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

sequelize.sync().then(() => {
  console.log('Socket server DB synced');

  io.on('connection', socket => {

    socket.on('LEAVE_CHATROOMS', ({ room }: { room: string }) => {
      socket.leave(room);
    });

    // ── Chatroom messages ────────────────────────────────────────────────
    socket.on('GET_CHATROOM_MESSAGES', async (data: ChatroomMsgData) => {
      socket.leave(data.previousRoom);
      socket.join(data.room);

      const messages = await Message.findAll({ where: { chatroomId: data.chatroomId }, order: ORDER });
      io.to(data.socketId).emit('RECEIVE_CHATROOM_MESSAGES', messages);

      if (data.serverId) {
        const server = await ServerModel.findByPk(data.serverId);
        if (server) io.in(data.room).emit('RECEIVE_SERVER_LIST', server.userList ?? []);
      }
    });

    socket.on('CHATROOM_MESSAGE', async (data: ChatroomMsgData) => {
      await Message.create({
        username: data.username,
        message: data.message,
        userId: data.userId,
        chatroomId: data.chatroomId,
        friendId: null,
      });
      const messages = await Message.findAll({ where: { chatroomId: data.chatroomId }, order: ORDER });
      io.in(data.room).emit('RECEIVE_CHATROOM_MESSAGES', messages);
    });

    socket.on('DELETE_CHATROOM_MESSAGE', async (data: ChatroomMsgData) => {
      await Message.destroy({ where: { id: data.messageId } });
      const messages = await Message.findAll({ where: { chatroomId: data.chatroomId }, order: ORDER });
      io.in(data.room).emit('RECEIVE_CHATROOM_MESSAGES', messages);
    });

    socket.on('EDIT_CHATROOM_MESSAGE', async (data: ChatroomMsgData) => {
      const msg = await Message.findByPk(data.messageId);
      if (msg) await msg.update({ message: data.message });
      const messages = await Message.findAll({ where: { chatroomId: data.chatroomId }, order: ORDER });
      io.in(data.room).emit('RECEIVE_CHATROOM_MESSAGES', messages);
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
      await Message.create({ username: data.username, message: data.message, userId: uid, friendId: uid, chatroomId: null });
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
      await Message.create({ username: data.username, message: data.message, userId: uid, friendId: fid, chatroomId: null });
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

    socket.on('KICK_SERVER_USER', async (data: ServerData) => {
      const server = await ServerModel.findByPk(data.serverId);
      if (server) io.in(data.room).emit('RECEIVE_SERVER_LIST', server.userList ?? []);
    });

    socket.on('BAN_SERVER_USER', async (data: ServerData) => {
      const server = await ServerModel.findByPk(data.serverId);
      if (server) io.in(data.room).emit('RECEIVE_SERVER_LIST', server.userList ?? []);
    });

    // ── WebRTC signalling ─────────────────────────────────────────────────
    socket.on('SEND_ICE_CANDIDATE', (data: { room: string }) => socket.to(data.room).emit('RECEIVE_ICE_CANDIDATE', data));
    socket.on('SEND_OFFER', (data: { room: string }) => socket.to(data.room).emit('RECEIVE_OFFER', data));
    socket.on('SEND_ANSWER', (data: { room: string }) => socket.to(data.room).emit('RECEIVE_ANSWER', data));

    // ── Voice channels ────────────────────────────────────────────────────
    socket.on('JOIN_VOICE', ({ username, chatroomId, room }: { username: string; chatroomId: number; room: string }) => {
      const users = voiceChannels.get(chatroomId) ?? [];
      socket.emit('VOICE_USERS', users.map(u => u.username));
      users.push({ username, socketId: socket.id, room });
      voiceChannels.set(chatroomId, users);
      socket.join(room);
      socket.to(room).emit('VOICE_USER_JOINED', { username });
    });

    socket.on('LEAVE_VOICE', ({ username, chatroomId, room }: { username: string; chatroomId: number; room: string }) => {
      const users = voiceChannels.get(chatroomId) ?? [];
      voiceChannels.set(chatroomId, users.filter(u => u.socketId !== socket.id));
      socket.leave(room);
      socket.to(room).emit('VOICE_USER_LEFT', { username });
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

    socket.on('disconnect', () => {
      voiceChannels.forEach((channelUsers, chatroomId) => {
        const user = channelUsers.find(u => u.socketId === socket.id);
        if (user) {
          voiceChannels.set(chatroomId, channelUsers.filter(u => u.socketId !== socket.id));
          socket.to(user.room).emit('VOICE_USER_LEFT', { username: user.username });
        }
      });
    });

    // ── Online user presence ──────────────────────────────────────────────
    socket.on('SEND_USER', (data: UserPresence) => {
      const existing = users.find(u => u.username === data.username);
      if (!existing) {
        users.push(data);
      } else {
        existing.active = true;
      }
      io.emit('RECEIVE_USERS', users);
    });

    socket.on('LOGOUT_USER', (data: { username: string }) => {
      const user = users.find(u => u.username === data.username);
      if (user) user.active = false;
      io.emit('RECEIVE_USERS', users);
    });

    socket.on('GET_USERS', () => {
      io.emit('RECEIVE_USERS', users);
    });
  });

  httpServer.listen(PORT, () => console.log(`Socket.io server listening on port ${PORT}`));
});
