import { neon } from '@neondatabase/serverless';
let connection;
export const database=()=>{
  if(!process.env.DATABASE_URL)throw Object.assign(new Error('Cloud accounts are not connected yet. Follow the launch guide to add your Neon database.'),{status:503});
  return connection ||= neon(process.env.DATABASE_URL);
};
export const safeUser=(u)=>({id:u.id,name:u.name,email:u.email,paid:!!u.is_demo || new Date(u.paid_until||0)>new Date(),demo:!!u.is_demo,paidUntil:u.paid_until});
