import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

export interface ServerAttributes {
  id: number;
  name: string;
  userId: number;
  public: boolean;
  region: string;
  active: boolean;
  imageUrl: string | null;
  userList: object[];
  userBans: object[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type ServerCreationAttributes = Optional<ServerAttributes, 'id' | 'imageUrl' | 'userList' | 'userBans'>;

class Server extends Model<ServerAttributes, ServerCreationAttributes> implements ServerAttributes {
  declare id: number;
  declare name: string;
  declare userId: number;
  declare public: boolean;
  declare region: string;
  declare active: boolean;
  declare imageUrl: string | null;
  declare userList: object[];
  declare userBans: object[] | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Server.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    public: { type: DataTypes.BOOLEAN, allowNull: false },
    region: { type: DataTypes.STRING, allowNull: false },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    userList: { type: DataTypes.ARRAY(DataTypes.JSONB), defaultValue: [], allowNull: true },
    userBans: { type: DataTypes.ARRAY(DataTypes.JSONB), allowNull: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
  },
  { sequelize, modelName: 'servers' }
);

export default Server;
