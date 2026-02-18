import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { ENV } from './env.js';
import * as schema from '../db/schema.js';

// Validate DATABASE_URL exists
if (!ENV.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.error(
        'Available environment variables:',
        Object.keys(process.env).filter((key) => key.includes('DATABASE'))
    );
    process.exit(1);
}

console.log('✅ DATABASE_URL is configured');

const sql = neon(ENV.DATABASE_URL);
export const db = drizzle(sql, { schema });
