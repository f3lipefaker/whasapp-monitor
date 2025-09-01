import pkg from 'pg';
const { Pool } = pkg;

import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const pool = new Pool({
  host: process.env.HOST_DB,
  port: process.env.PORT_DB,
  database: process.env.DATA_BASE,
  user: process.env.USER_DB,
  password: process.env.PASS_DB
});
