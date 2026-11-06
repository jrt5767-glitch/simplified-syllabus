import { database } from '../lib/database.mjs';
import bcrypt from 'bcryptjs';
import { makeDemoCourses } from '../shared/syllabus.mjs';
const sql=database();
try{
  await sql`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,is_demo BOOLEAN NOT NULL DEFAULT FALSE,paid_until TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS course_count INTEGER NOT NULL DEFAULT 0`;
  await sql`CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL)`;
  await sql`CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)`;
  await sql`CREATE TABLE IF NOT EXISTS courses (id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,data JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`CREATE INDEX IF NOT EXISTS courses_user_idx ON courses(user_id)`;
  await sql`CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires_at TIMESTAMPTZ NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS checkout_sessions (session_id TEXT PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,paid_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  // Only the designated public demo account receives paid access. Never use this password for a personal account.
  const hash=await bcrypt.hash('password123!',12);
  const [demo]=await sql`INSERT INTO users (email,name,password_hash,is_demo,paid_until) VALUES ('demo@demo.com','Demo Student',${hash},TRUE,'2099-12-31T00:00:00Z') ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,is_demo=TRUE,paid_until=EXCLUDED.paid_until RETURNING id`;
  const [count]=await sql`SELECT COUNT(*) AS count FROM courses WHERE user_id=${demo.id}`;
  if(Number(count.count)===0)for(const c of makeDemoCourses())await sql`INSERT INTO courses(id,user_id,data) VALUES (${c.id},${demo.id},${JSON.stringify(c)}::jsonb) ON CONFLICT(id) DO NOTHING`;
  await sql`UPDATE users SET course_count=(SELECT COUNT(*) FROM courses WHERE courses.user_id=users.id)`;
  console.log('Database ready. Demo account exists: demo@demo.com / password123! (paid access).');
}catch(error){console.error('Database setup failed. Check DATABASE_URL and Neon connectivity. Error type:',error.name);process.exitCode=1;}
