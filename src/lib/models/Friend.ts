import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

export interface FriendAttributes {
  id: number;
  username: string;
  imageUrl: string | null;
  userId: number;
  friendId: number;
  activeFriend: boolean;
  groupId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type FriendCreationAttributes = Optional<FriendAttributes, 'id' | 'imageUrl'>;

class Friend extends Model<FriendAttributes, FriendCreationAttributes> implements FriendAttributes {
  declare id: number;
  declare username: string;
  declare imageUrl: string | null;
  declare userId: number;
  declare friendId: number;
  declare activeFriend: boolean;
  declare groupId: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Friend.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false },
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    friendId: { type: DataTypes.INTEGER, allowNull: false },
    activeFriend: { type: DataTypes.BOOLEAN, allowNull: false },
    groupId: { type: DataTypes.STRING, allowNull: false },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
  },
  { sequelize, modelName: 'friends' }
);

export default Friend;
