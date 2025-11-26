import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { schema } from './schema';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'lms.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create and configure database connection
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(schema);

export default db;

// Helper function to run a query and return all results
export function all<T>(sql: string, params: any[] = []): T[] {
  return db.prepare(sql).all(...params) as T[];
}

// Helper function to run a query and return first result
export function get<T>(sql: string, params: any[] = []): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

// Helper function to run an insert/update/delete
export function run(sql: string, params: any[] = []): Database.RunResult {
  return db.prepare(sql).run(...params);
}

// Transaction helper
export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}
