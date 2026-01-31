// Sessions API
// Handles CRUD operations for photo booth sessions

import { neon } from '@neondatabase/serverless';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
};

export default async (req, context) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // Check database configuration
    if (!process.env.DATABASE_URL) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Database not configured'
        }), { status: 500, headers: corsHeaders });
    }

    let sql;
    try {
        sql = neon(process.env.DATABASE_URL);
    } catch (e) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Database connection failed: ' + e.message
        }), { status: 500, headers: corsHeaders });
    }

    // Get user from token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized - no token'
        }), { status: 401, headers: corsHeaders });
    }

    let user;
    try {
        const result = await sql`
            SELECT u.id, u.email, u.display_name
            FROM users u
            JOIN auth_tokens t ON u.id = t.user_id
            WHERE t.token = ${token} AND t.expires_at > NOW()
        `;
        user = result.length > 0 ? result[0] : null;
    } catch (e) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Auth check failed: ' + e.message
        }), { status: 500, headers: corsHeaders });
    }

    if (!user) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized - invalid token'
        }), { status: 401, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get('id');
    const action = url.searchParams.get('action');

    try {
        // Handle active session actions
        if (action === 'get-active') {
            const result = await sql`
                SELECT active_session_id FROM users WHERE id = ${user.id}
            `;
            return new Response(JSON.stringify({
                success: true,
                activeSessionId: result[0]?.active_session_id || null
            }), { headers: corsHeaders });
        }

        if (action === 'set-active' && req.method === 'POST') {
            const { activeSessionId } = await req.json();

            // Verify the session belongs to this user (if not null)
            if (activeSessionId) {
                const sessionCheck = await sql`
                    SELECT id FROM sessions WHERE id = ${activeSessionId} AND user_id = ${user.id}
                `;
                if (sessionCheck.length === 0) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: 'Session not found or does not belong to you'
                    }), { status: 404, headers: corsHeaders });
                }
            }

            await sql`
                UPDATE users SET active_session_id = ${activeSessionId} WHERE id = ${user.id}
            `;

            return new Response(JSON.stringify({
                success: true,
                activeSessionId
            }), { headers: corsHeaders });
        }

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

        // POST - Create or update session (upsert)
        if (req.method === 'POST') {
            const { id, name, designUrl, settings } = await req.json();

            const newId = id || Date.now().toString();

            // Check if session exists
            const existing = await sql`
                SELECT id FROM sessions WHERE id = ${newId} AND user_id = ${user.id}
            `;

            if (existing.length > 0) {
                // Update existing session
                await sql`
                    UPDATE sessions
                    SET name = ${name},
                        design_url = ${designUrl || null},
                        settings = ${JSON.stringify(settings || {})}::jsonb,
                        updated_at = NOW()
                    WHERE id = ${newId} AND user_id = ${user.id}
                `;
            } else {
                // Insert new session
                await sql`
                    INSERT INTO sessions (id, user_id, name, design_url, settings)
                    VALUES (${newId}, ${user.id}, ${name}, ${designUrl || null}, ${JSON.stringify(settings || {})})
                `;
            }

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
