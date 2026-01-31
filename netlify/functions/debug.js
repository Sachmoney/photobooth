// Debug API - Check database status and photos

import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    if (!process.env.DATABASE_URL) {
        return new Response(JSON.stringify({
            error: 'DATABASE_URL not set'
        }), { headers });
    }

    try {
        const sql = neon(process.env.DATABASE_URL);

        // Count users
        const users = await sql`SELECT COUNT(*) as count FROM users`;

        // Count photos
        const photos = await sql`SELECT COUNT(*) as count FROM photos`;

        // Get recent photos (just IDs, not data)
        const recentPhotos = await sql`
            SELECT id, user_id, is_strip, is_collage, created_at,
                   LEFT(photo_url, 50) as photo_url_preview
            FROM photos
            ORDER BY created_at DESC
            LIMIT 5
        `;

        // Count auth tokens
        const tokens = await sql`SELECT COUNT(*) as count FROM auth_tokens WHERE expires_at > NOW()`;

        return new Response(JSON.stringify({
            success: true,
            database: 'connected',
            counts: {
                users: users[0].count,
                photos: photos[0].count,
                activeTokens: tokens[0].count
            },
            recentPhotos: recentPhotos
        }, null, 2), { headers });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), { status: 500, headers });
    }
};

export const config = {
    path: "/api/debug"
};
