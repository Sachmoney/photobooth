// Database Setup - Run once to create tables
// Trigger: GET /api/db-setup

import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
        return new Response(JSON.stringify({
            success: false,
            error: 'DATABASE_URL environment variable is not set. Please add it in Netlify Site Settings > Environment Variables.'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    let sql;
    try {
        sql = neon(process.env.DATABASE_URL);
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to connect to database: ' + error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Create users table
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                display_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Create sessions table (photo booth sessions, not auth sessions)
        await sql`
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(50) PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                design_url TEXT,
                settings JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Create photos table (photo_url stores base64 data)
        await sql`
            CREATE TABLE IF NOT EXISTS photos (
                id VARCHAR(50) PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                session_id VARCHAR(50) REFERENCES sessions(id) ON DELETE SET NULL,
                photo_url TEXT,
                thumbnail_url TEXT,
                is_strip BOOLEAN DEFAULT FALSE,
                is_collage BOOLEAN DEFAULT FALSE,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Alter photo_url column to handle large base64 data if table already exists
        await sql`
            ALTER TABLE photos ALTER COLUMN photo_url TYPE TEXT
        `.catch(() => {});  // Ignore error if column is already TEXT

        // Create auth_tokens table for session management
        await sql`
            CREATE TABLE IF NOT EXISTS auth_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        return new Response(JSON.stringify({
            success: true,
            message: 'Database tables created successfully'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Database setup error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const config = {
    path: "/api/db-setup"
};
