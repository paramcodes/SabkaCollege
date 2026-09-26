import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { schema } from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to create the database client.");
}

const client = neon(databaseUrl);

export const db = drizzle(client, { schema });
export type Database = typeof db;
export { schema };
