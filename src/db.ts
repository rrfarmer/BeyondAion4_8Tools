import mysql from "mysql2/promise";
import { config } from "./config.js";

export const loginDb = mysql.createPool({
  host: config.loginDb.host,
  port: config.loginDb.port,
  user: config.loginDb.user,
  password: config.loginDb.password,
  database: config.loginDb.database,
  waitForConnections: true,
  connectionLimit: 5,
  timezone: "Z",
});

export const gameDb = mysql.createPool({
  host: config.gameDb.host,
  port: config.gameDb.port,
  user: config.gameDb.user,
  password: config.gameDb.password,
  database: config.gameDb.database,
  waitForConnections: true,
  connectionLimit: 5,
  timezone: "Z",
});

export async function closeDbPools(): Promise<void> {
  await Promise.all([loginDb.end(), gameDb.end()]);
}
