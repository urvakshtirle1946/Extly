import { Pool } from 'pg'
import { parse } from 'pg-connection-string'
import dotenv from 'dotenv'

// Load env vars early — db.ts is imported before dotenv.config() runs in index.ts
dotenv.config()

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL environment variable is not set')
const poolConfig = parse(connectionString)

export const pool = new Pool({
  ...(poolConfig as any),
  ssl: {
    rejectUnauthorized: false // Bypasses self-signed certificate validation for Aiven
  }
})

// Query helper
export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params)
}

const DDL = `
-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'idle',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Files Table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  path VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, path)
);

-- 4. Generations Table
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  files_snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  feedback VARCHAR(10) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`

export async function initDb() {
  console.log('[Database] Connecting to Aiven PostgreSQL...')
  try {
    const client = await pool.connect()
    console.log('[Database] Connected successfully!')
    
    // Dynamic migration to convert users.id and projects.user_id from UUID to VARCHAR(255) for Clerk compatibility
    console.log('[Database] Running type migrations for Clerk user IDs...')
    await client.query(`
      DO $$
      BEGIN
        -- 1. Drop foreign key constraint if it exists
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'projects_user_id_fkey' AND table_name = 'projects'
        ) THEN
          ALTER TABLE projects DROP CONSTRAINT projects_user_id_fkey;
        END IF;

        -- 2. Alter column types to VARCHAR(255)
        ALTER TABLE users ALTER COLUMN id TYPE VARCHAR(255);
        ALTER TABLE projects ALTER COLUMN user_id TYPE VARCHAR(255);

        -- 3. Re-add foreign key constraint referencing users(id)
        ALTER TABLE projects 
          ADD CONSTRAINT projects_user_id_fkey 
          FOREIGN KEY (user_id) 
          REFERENCES users(id) 
          ON DELETE CASCADE;
      EXCEPTION
        WHEN OTHERS THEN
          -- Log and allow proceeding if constraints aren't matches (e.g. fresh DB)
          RAISE NOTICE 'Constraint migration skipped or handled: %', SQLERRM;
      END $$;
    `)

    console.log('[Database] Running DDL migrations...')
    await client.query(DDL)
    
    // Dynamically add feedback column if it doesn't exist
    await client.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS feedback VARCHAR(10) DEFAULT NULL;
    `)
    // Dynamically add plan column if it doesn't exist
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';
    `)
    // Dynamically add credit columns if they don't exist
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS total_credits INTEGER DEFAULT 10;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS used_credits INTEGER DEFAULT 0;
    `)
    console.log('[Database] Migrations executed successfully!')
    
    client.release()
  } catch (error) {
    console.error('[Database] Connection or migration failed:', error)
    process.exit(1)
  }
}
