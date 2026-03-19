import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

export interface MessageAttributes {
  id: number;
  username: string;
  message: string;
  userId: number;
  friendId: number | null;
  chatroomId: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type MessageCreationAttributes = Optional<MessageAttributes, 'id' | 'friendId' | 'chatroomId'>;

class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  declare id: number;
  declare username: string;
  declare message: string;
  declare userId: number;
  declare friendId: number | null;
  declare chatroomId: number | null;
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
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
  },
  { sequelize, modelName: 'messages' }
);

export default Message;
