import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

declare global {
  // Reuse the pool during local hot reloads so development does not exhaust
  // PostgreSQL connections.
  // eslint-disable-next-line no-var
  var promptexAuthDatabase: Kysely<unknown> | undefined;
}

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/promptex";


export const authDatabase =
  global.promptexAuthDatabase ??
  new Kysely<unknown>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: databaseUrl,
        // The production database uses TLS. Set DATABASE_SSL=false only for a
        // local Postgres instance that does not support TLS.
        ssl:
          process.env.DATABASE_SSL === "false"
            ? undefined
            : { rejectUnauthorized: false },
      }),
    }),
  });

if (process.env.NODE_ENV !== "production") {
  global.promptexAuthDatabase = authDatabase;
}
