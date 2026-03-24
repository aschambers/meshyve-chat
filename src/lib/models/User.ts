import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';
import bcrypt from 'bcryptjs';

export interface UserAttributes {
  id: number;
  username: string;
  password: string;
  email: string;
  active: boolean;
  type: string;
  imageUrl: string | null;
  nameColor: string | null;
  description: string | null;
  emojiUsage: Record<string, number> | null;
  resetPasswordToken: string | null;
  pushNotificationToken: string | null;
  privateMessages: object[];
  personalMessages: object[];
  chatroomsList: object[];
  serversList: object[];
  isVerified: boolean;
  token: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'imageUrl' | 'nameColor' | 'description' | 'emojiUsage' | 'resetPasswordToken' | 'pushNotificationToken' | 'privateMessages' | 'personalMessages' | 'chatroomsList' | 'serversList' | 'token'>;

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare username: string;
  declare password: string;
  declare email: string;
  declare active: boolean;
  declare type: string;
  declare imageUrl: string | null;
  declare nameColor: string | null;
  declare description: string | null;
  declare emojiUsage: Record<string, number> | null;
  declare resetPasswordToken: string | null;
  declare pushNotificationToken: string | null;
  declare privateMessages: object[];
  declare personalMessages: object[];
  declare chatroomsList: object[];
  declare serversList: object[];
  declare isVerified: boolean;
  declare token: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'user' },
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    nameColor: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    emojiUsage: { type: DataTypes.JSONB, allowNull: true, defaultValue: null },
    resetPasswordToken: { type: DataTypes.STRING, allowNull: true },
    pushNotificationToken: { type: DataTypes.STRING, allowNull: true },
    privateMessages: { type: DataTypes.ARRAY(DataTypes.JSONB), defaultValue: [], allowNull: true },
    personalMessages: { type: DataTypes.ARRAY(DataTypes.JSONB), defaultValue: [], allowNull: true },
    chatroomsList: { type: DataTypes.ARRAY(DataTypes.JSONB), defaultValue: [], allowNull: true },
    serversList: { type: DataTypes.ARRAY(DataTypes.JSONB), defaultValue: [], allowNull: true },
    isVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    token: { type: DataTypes.STRING, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
  },
  {
    sequelize,
    modelName: 'users',
    hooks: {
      beforeSave: (user, options) => {
        if (options.fields?.includes('password')) {
          user.password = bcrypt.hashSync(user.password, 10);
        }
      },
    },
  }
);

export default User;
