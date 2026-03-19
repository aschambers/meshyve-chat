import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

export interface InviteAttributes {
  id: number;
  token: string;
  code: string;
  expires: number;
  serverId: number;
  email: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type InviteCreationAttributes = Optional<InviteAttributes, 'id' | 'email'>;

class Invite extends Model<InviteAttributes, InviteCreationAttributes> implements InviteAttributes {
  declare id: number;
  declare token: string;
  declare code: string;
  declare expires: number;
  declare serverId: number;
  declare email: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Invite.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    token: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    expires: { type: DataTypes.INTEGER, allowNull: false },
    serverId: { type: DataTypes.INTEGER, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
  },
  { sequelize, modelName: 'invites' }
);

export default Invite;
