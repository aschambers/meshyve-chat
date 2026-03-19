export interface Server {
  serverId: number;
  name: string;
  imageUrl?: string;
  active?: boolean;
  userList?: ServerUser[];
  userBans?: ServerUser[];
}

export interface ServerUser {
  userId: number;
  username: string;
  type: 'owner' | 'admin' | 'moderator' | 'voice' | 'user';
  imageUrl?: string;
  active?: boolean;
}

export interface Chatroom {
  id: number;
  name: string;
  type: 'text' | 'voice';
  serverId: number;
  categoryId?: number;
  position?: number | null;
}

export interface Friend {
  id: number;
  userId: number;
  friendId: number | null;
  groupId: string;
  username: string;
  activeFriend: boolean;
}

export interface Message {
  id: number;
  username: string;
  message: string;
  userId: number;
  chatroomId: number | null;
  friendId: number | null;
  updatedAt: string;
  createdAt: string;
}

export interface Invite {
  id: number;
  token: string;
  code: string;
  expires: number;
  serverId: number;
  email?: string;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  serverId: number;
  order: number;
  visible: boolean;
}
