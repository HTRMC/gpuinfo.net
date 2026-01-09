import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// Get database URL from environment
// In dev: vite-plugin-db sets VITE_DATABASE_URL
// In prod: Set DATABASE_URL in Vercel environment variables
const getDatabaseUrl = () => {
  // Server-side: use DATABASE_URL or VITE_DATABASE_URL
  const url = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL

  if (!url) {
    throw new Error(
      'Database URL not found. Set DATABASE_URL (production) or VITE_DATABASE_URL (development).'
    )
  }

  return url
}

// Create a function to get db instance (lazy initialization)
let _db: ReturnType<typeof createDb> | null = null

function createDb() {
  const sql = neon(getDatabaseUrl())
  return drizzle(sql, { schema })
}

export function getDb() {
  if (!_db) {
    _db = createDb()
  }
  return _db
}

// Export schema for convenience
export * from './schema'

// Export db type
export type Database = ReturnType<typeof getDb>
