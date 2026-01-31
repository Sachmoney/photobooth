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
            error: 'No auth token provided'
        }), { status: 401, headers: corsHeaders });
    }

    let user;
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

        user = userResult[0];
    } catch (e) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Auth check failed: ' + e.message
        }), { status: 500, headers: corsHeaders });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Invalid JSON body: ' + e.message
        }), { status: 400, headers: corsHeaders });
    }

    const { photoData, photoId, sessionId, isStrip, isCollage } = body;

    if (!photoData) {
        return new Response(JSON.stringify({
            success: false,
            error: 'No photo data provided'
        }), { status: 400, headers: corsHeaders });
    }

    // Check photo size
    const photoSizeKB = Math.round(photoData.length / 1024);
    console.log('Photo size:', photoSizeKB, 'KB');

    if (photoSizeKB > 5000) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Photo too large: ' + photoSizeKB + 'KB (max 5MB)'
        }), { status: 400, headers: corsHeaders });
    }

    const id = photoId || Date.now().toString();

    try {
        // Store photo data in database
        await sql`
            INSERT INTO photos (id, user_id, session_id, photo_url, is_strip, is_collage, created_at)
            VALUES (${id}, ${user.id}, ${sessionId || null}, ${photoData}, ${isStrip || false}, ${isCollage || false}, NOW())
            ON CONFLICT (id) DO UPDATE
            SET photo_url = EXCLUDED.photo_url, updated_at = NOW()
        `;

        console.log('Photo saved successfully:', id);

        return new Response(JSON.stringify({
            success: true,
            photoId: id,
            photoUrl: `/api/photo?id=${id}`
        }), { headers: corsHeaders });

    } catch (error) {
        console.error('Database insert error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Database error: ' + error.message
        }), { status: 500, headers: corsHeaders });
    }
};

export const config = {
    path: "/api/upload"
};
