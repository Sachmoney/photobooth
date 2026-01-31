// Authentication API
// Handles signup, login, logout, and user info

import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const sql = neon(process.env.DATABASE_URL);

// Hash password using SHA-256 (in production, use bcrypt)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate auth token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
};

export default async (req, context) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    try {
        // SIGNUP
        if (action === 'signup' && req.method === 'POST') {
            const { email, password, displayName } = await req.json();

            if (!email || !password) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Email and password are required'
                }), { status: 400, headers: corsHeaders });
            }

            // Check if user exists
            const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
            if (existing.length > 0) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Email already registered'
                }), { status: 400, headers: corsHeaders });
            }

            // Create user
            const passwordHash = hashPassword(password);
            const result = await sql`
                INSERT INTO users (email, password_hash, display_name)
                VALUES (${email}, ${passwordHash}, ${displayName || email.split('@')[0]})
                RETURNING id, email, display_name
            `;

            const user = result[0];

            // Generate token
            const token = generateToken();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await sql`
                INSERT INTO auth_tokens (user_id, token, expires_at)
                VALUES (${user.id}, ${token}, ${expiresAt})
            `;

            return new Response(JSON.stringify({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    displayName: user.display_name
                },
                token
            }), { headers: corsHeaders });
        }

        // LOGIN
        if (action === 'login' && req.method === 'POST') {
            const { email, password } = await req.json();

            if (!email || !password) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Email and password are required'
                }), { status: 400, headers: corsHeaders });
            }

            const passwordHash = hashPassword(password);
            const result = await sql`
                SELECT id, email, display_name
                FROM users
                WHERE email = ${email} AND password_hash = ${passwordHash}
            `;

            if (result.length === 0) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid email or password'
                }), { status: 401, headers: corsHeaders });
            }

            const user = result[0];

            // Generate token
            const token = generateToken();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await sql`
                INSERT INTO auth_tokens (user_id, token, expires_at)
                VALUES (${user.id}, ${token}, ${expiresAt})
            `;

            return new Response(JSON.stringify({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    displayName: user.display_name
                },
                token
            }), { headers: corsHeaders });
        }

        // LOGOUT
        if (action === 'logout' && req.method === 'POST') {
            const authHeader = req.headers.get('Authorization');
            const token = authHeader?.replace('Bearer ', '');

            if (token) {
                await sql`DELETE FROM auth_tokens WHERE token = ${token}`;
            }

            return new Response(JSON.stringify({
                success: true
            }), { headers: corsHeaders });
        }

        // GET CURRENT USER
        if (action === 'me' && req.method === 'GET') {
            const authHeader = req.headers.get('Authorization');
            const token = authHeader?.replace('Bearer ', '');

            if (!token) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'No token provided'
                }), { status: 401, headers: corsHeaders });
            }

            const result = await sql`
                SELECT u.id, u.email, u.display_name
                FROM users u
                JOIN auth_tokens t ON u.id = t.user_id
                WHERE t.token = ${token} AND t.expires_at > NOW()
            `;

            if (result.length === 0) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid or expired token'
                }), { status: 401, headers: corsHeaders });
            }

            const user = result[0];

            return new Response(JSON.stringify({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    displayName: user.display_name
                }
            }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({
            success: false,
            error: 'Invalid action'
        }), { status: 400, headers: corsHeaders });

    } catch (error) {
        console.error('Auth error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), { status: 500, headers: corsHeaders });
    }
};

export const config = {
    path: "/api/auth"
};
