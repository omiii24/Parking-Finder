import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export const sqlite = new Database("parking.db");
export const db = drizzle(sqlite, { schema });