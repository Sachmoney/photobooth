// Delete Photos API
// Deletes photos from database

import { neon } from '@neondatabase/serverless';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Content-Type': 'application/json'
};

export default async (req, context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST' && req.method !== 'DELETE') {
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

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized'
        }), { status: 401, headers: corsHeaders });
    }

    try {
        // Get user from token
        const userResult = await sql`
            SELECT u.id FROM users u
            JOIN auth_tokens t ON u.id = t.user_id
            WHERE t.token = ${token} AND t.expires_at > NOW()
        `;

        if (userResult.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid or expired token'
            }), { status: 401, headers: corsHeaders });
        }

        const userId = userResult[0].id;

        // Check if specific photo ID or delete all
        const url = new URL(req.url);
        const photoId = url.searchParams.get('id');

        if (photoId) {
            // Delete specific photo
            await sql`DELETE FROM photos WHERE id = ${photoId} AND user_id = ${userId}`;
            return new Response(JSON.stringify({
                success: true,
                message: 'Photo deleted'
            }), { headers: corsHeaders });
        } else {
            // Delete all photos for user
            const result = await sql`DELETE FROM photos WHERE user_id = ${userId}`;
            return new Response(JSON.stringify({
                success: true,
                message: 'All photos deleted',
                count: result.count || 0
            }), { headers: corsHeaders });
        }

    } catch (error) {
        console.error('Delete error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), { status: 500, headers: corsHeaders });
    }
};

export const config = {
    path: "/api/delete-photos"
};
