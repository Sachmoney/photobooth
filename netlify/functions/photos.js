// Photos API
// Handles CRUD operations for photo metadata

import { neon } from '@neondatabase/serverless';
import { getStore } from '@netlify/blobs';

const sql = neon(process.env.DATABASE_URL);

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
    const photoId = url.searchParams.get('id');

    try {
        // GET - List all photos or get one
        if (req.method === 'GET') {
            if (photoId) {
                const result = await sql`
                    SELECT * FROM photos
                    WHERE id = ${photoId} AND user_id = ${user.id}
                `;

                if (result.length === 0) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: 'Photo not found'
                    }), { status: 404, headers: corsHeaders });
                }

                return new Response(JSON.stringify({
                    success: true,
                    photo: result[0]
                }), { headers: corsHeaders });
            }

            const sessionId = url.searchParams.get('sessionId');
            let result;

            if (sessionId) {
                result = await sql`
                    SELECT * FROM photos
                    WHERE user_id = ${user.id} AND session_id = ${sessionId}
                    ORDER BY created_at DESC
                `;
            } else {
                result = await sql`
                    SELECT * FROM photos
                    WHERE user_id = ${user.id}
                    ORDER BY created_at DESC
                `;
            }

            return new Response(JSON.stringify({
                success: true,
                photos: result
            }), { headers: corsHeaders });
        }

        // POST - Create new photo record
        if (req.method === 'POST') {
            const { id, sessionId, photoUrl, thumbnailUrl, isStrip, isCollage, metadata } = await req.json();

            const newId = id || Date.now().toString();

            await sql`
                INSERT INTO photos (id, user_id, session_id, photo_url, thumbnail_url, is_strip, is_collage, metadata)
                VALUES (${newId}, ${user.id}, ${sessionId || null}, ${photoUrl || null}, ${thumbnailUrl || null}, ${isStrip || false}, ${isCollage || false}, ${JSON.stringify(metadata || {})})
            `;

            return new Response(JSON.stringify({
                success: true,
                photo: { id: newId }
            }), { status: 201, headers: corsHeaders });
        }

        // DELETE - Delete photo
        if (req.method === 'DELETE') {
            if (!photoId) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Photo ID required'
                }), { status: 400, headers: corsHeaders });
            }

            // Get photo to delete blob
            const photo = await sql`
                SELECT photo_url FROM photos
                WHERE id = ${photoId} AND user_id = ${user.id}
            `;

            if (photo.length > 0 && photo[0].photo_url) {
                // Try to delete from blob storage
                try {
                    const store = getStore('photos');
                    const blobKey = photo[0].photo_url.split('/').pop();
                    await store.delete(blobKey);
                } catch (e) {
                    console.log('Blob delete failed (may not exist):', e.message);
                }
            }

            await sql`
                DELETE FROM photos
                WHERE id = ${photoId} AND user_id = ${user.id}
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
        console.error('Photos error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), { status: 500, headers: corsHeaders });
    }
};

export const config = {
    path: "/api/photos"
};
