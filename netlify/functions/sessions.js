// Sessions API
// Handles CRUD operations for photo booth sessions

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
};

// Get user from token
async function getUserFromToken(token) {
    if (!token) return null;

    const result = await sql`
        SELECT u.id, u.email, u.display_name
        FROM users u
        JOIN auth_tokens t ON u.id = t.user_id
        WHERE t.token = ${token} AND t.expires_at > NOW()
    `;

    return result.length > 0 ? result[0] : null;
}

export default async (req, context) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const user = await getUserFromToken(token);

    if (!user) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized'
        }), { status: 401, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get('id');

    try {
        // GET - List all sessions or get one
        if (req.method === 'GET') {
            if (sessionId) {
                const result = await sql`
                    SELECT * FROM sessions
                    WHERE id = ${sessionId} AND user_id = ${user.id}
                `;

                if (result.length === 0) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: 'Session not found'
                    }), { status: 404, headers: corsHeaders });
                }

                return new Response(JSON.stringify({
                    success: true,
                    session: result[0]
                }), { headers: corsHeaders });
            }

            const result = await sql`
                SELECT * FROM sessions
                WHERE user_id = ${user.id}
                ORDER BY created_at DESC
            `;

            return new Response(JSON.stringify({
                success: true,
                sessions: result
            }), { headers: corsHeaders });
        }

        // POST - Create new session
        if (req.method === 'POST') {
            const { id, name, designUrl, settings } = await req.json();

            const newId = id || Date.now().toString();

            await sql`
                INSERT INTO sessions (id, user_id, name, design_url, settings)
                VALUES (${newId}, ${user.id}, ${name}, ${designUrl || null}, ${JSON.stringify(settings || {})})
            `;

            return new Response(JSON.stringify({
                success: true,
                session: { id: newId, name, designUrl, settings }
            }), { status: 201, headers: corsHeaders });
        }

        // PUT - Update session
        if (req.method === 'PUT') {
            if (!sessionId) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Session ID required'
                }), { status: 400, headers: corsHeaders });
            }

            const { name, designUrl, settings } = await req.json();

            await sql`
                UPDATE sessions
                SET name = COALESCE(${name}, name),
                    design_url = COALESCE(${designUrl}, design_url),
                    settings = COALESCE(${settings ? JSON.stringify(settings) : null}::jsonb, settings),
                    updated_at = NOW()
                WHERE id = ${sessionId} AND user_id = ${user.id}
            `;

            return new Response(JSON.stringify({
                success: true
            }), { headers: corsHeaders });
        }

        // DELETE - Delete session
        if (req.method === 'DELETE') {
            if (!sessionId) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Session ID required'
                }), { status: 400, headers: corsHeaders });
            }

            await sql`
                DELETE FROM sessions
                WHERE id = ${sessionId} AND user_id = ${user.id}
            `;

            return new Response(JSON.stringify({
                success: true
            }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({
            success: false,
            error: 'Method not allowed'
        }), { status: 405, headers: corsHeaders });

    } catch (error) {
        console.error('Sessions error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), { status: 500, headers: corsHeaders });
    }
};

export const config = {
    path: "/api/sessions"
};
