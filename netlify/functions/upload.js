// Upload API
// Handles photo uploads - stores base64 data directly in database

import { neon } from '@neondatabase/serverless';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

export default async (req, context) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({
            success: false,
            error: 'Method not allowed'
        }), { status: 405, headers: corsHeaders });
    }

    if (!process.env.DATABASE_URL) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Database not configured'
        }), { status: 500, headers: corsHeaders });
    }

    const sql = neon(process.env.DATABASE_URL);

    // Get user from token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized'
        }), { status: 401, headers: corsHeaders });
    }

    try {
        const userResult = await sql`
            SELECT u.id, u.email
            FROM users u
            JOIN auth_tokens t ON u.id = t.user_id
            WHERE t.token = ${token} AND t.expires_at > NOW()
        `;

        if (userResult.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid or expired token'
            }), { status: 401, headers: corsHeaders });
        }

        const user = userResult[0];
        const { photoData, photoId, sessionId, isStrip, isCollage } = await req.json();

        if (!photoData) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No photo data provided'
            }), { status: 400, headers: corsHeaders });
        }

        const id = photoId || Date.now().toString();

        // Store photo data directly in database
        await sql`
            INSERT INTO photos (id, user_id, session_id, photo_url, is_strip, is_collage)
            VALUES (${id}, ${user.id}, ${sessionId || null}, ${photoData}, ${isStrip || false}, ${isCollage || false})
            ON CONFLICT (id) DO UPDATE
            SET photo_url = ${photoData}, updated_at = NOW()
        `;

        return new Response(JSON.stringify({
            success: true,
            photoId: id,
            photoUrl: `/api/photo?id=${id}`
        }), { headers: corsHeaders });

    } catch (error) {
        console.error('Upload error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), { status: 500, headers: corsHeaders });
    }
};

export const config = {
    path: "/api/upload"
};
