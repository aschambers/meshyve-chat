import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

export interface MessageAttributes {
  id: number;
  username: string;
  message: string;
  userId: number;
  friendId: number | null;
  chatroomId: number | null;
  nameColor: string | null;
  reactions: Record<string, number[]> | null;
  parentId: number | null;
  isPrivate: boolean;
  isPinned: boolean;
  forwardedFrom: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type MessageCreationAttributes = Optional<MessageAttributes, 'id' | 'friendId' | 'chatroomId' | 'nameColor' | 'reactions' | 'parentId' | 'isPrivate' | 'isPinned' | 'forwardedFrom'>;

class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  declare id: number;
  declare username: string;
  declare message: string;
  declare userId: number;
  declare friendId: number | null;
  declare chatroomId: number | null;
  declare nameColor: string | null;
  declare reactions: Record<string, number[]> | null;
  declare parentId: number | null;
  declare isPrivate: boolean;
  declare isPinned: boolean;
  declare forwardedFrom: Record<string, unknown> | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Message.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    friendId: { type: DataTypes.INTEGER, allowNull: true },
    chatroomId: { type: DataTypes.INTEGER, allowNull: true },
    nameColor: { type: DataTypes.STRING, allowNull: true },
    reactions: { type: DataTypes.JSONB, allowNull: true, defaultValue: null },
    parentId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    isPrivate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isPinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    forwardedFrom: { type: DataTypes.JSONB, allowNull: true, defaultValue: null },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
  },
  { sequelize, modelName: 'messages' }
);

export default Message;
