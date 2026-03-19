import { Sequelize } from 'sequelize';
import { requireEnv } from '@/lib/env';

const sequelize = new Sequelize(
  requireEnv('DB_NAME'),
  requireEnv('DB_USER'),
  requireEnv('DB_PASSWORD'),
  {
    dialect: 'postgres',
    host: requireEnv('DB_HOST'),
    port: 5432,
    pool: { max: 5, min: 0, idle: 30000, acquire: 60000 },
    dialectOptions: {
      ssl: process.env.DATABASE_SSL === 'true'
        ? { require: true, rejectUnauthorized: false }
        : false,
    },
    logging: false,
  }
);

export default sequelize;
