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
  joinedAt?: string;
  nameColor?: string | null;
}

export interface Chatroom {
  id: number;
  name: string;
  type: 'text' | 'voice';
  serverId: number;
  categoryId?: number;
  position?: number | null;
  slowmode?: number;
  isPrivate?: boolean;
  allowedUserIds?: number[];
}

export interface Friend {
  id: number;
  userId: number;
  friendId: number | null;
  groupId: string;
  username: string;
  imageUrl?: string | null;
  activeFriend: boolean;
  isFriend?: boolean;
}

export interface ForwardedFrom {
  type: 'channel' | 'dm';
  chatroomId?: number;
  chatroomName?: string;
  serverId?: number;
  serverName?: string;
  groupId?: string;
  username?: string;
  messageId?: number;
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
  nameColor?: string | null;
  reactions?: Record<string, number[]> | null;
  parentId?: number | null;
  isPrivate?: boolean;
  isPinned?: boolean;
  forwardedFrom?: ForwardedFrom | null;
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
  isPrivate?: boolean;
  allowedUserIds?: number[];
}
