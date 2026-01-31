// Upload API
// Handles photo file uploads to Netlify Blobs

import { neon } from '@neondatabase/serverless';
import { getStore } from '@netlify/blobs';

const sql = neon(process.env.DATABASE_URL);

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({
            success: false,
            error: 'Method not allowed'
        }), { status: 405, headers: corsHeaders });
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

    try {
        const { photoData, photoId, sessionId, isStrip, isCollage } = await req.json();

        if (!photoData) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No photo data provided'
            }), { status: 400, headers: corsHeaders });
        }

        // Convert base64 to buffer
        const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Store in Netlify Blobs
        const store = getStore('photos');
        const id = photoId || Date.now().toString();
        const blobKey = `${user.id}/${id}.jpg`;

        await store.set(blobKey, buffer, {
            metadata: {
                userId: user.id.toString(),
                sessionId: sessionId || '',
                isStrip: isStrip ? 'true' : 'false',
                isCollage: isCollage ? 'true' : 'false'
            }
        });

        // Get the URL (Netlify Blobs provides URLs automatically)
        const photoUrl = `/.netlify/blobs/photos/${blobKey}`;

        // Save to database
        await sql`
            INSERT INTO photos (id, user_id, session_id, photo_url, is_strip, is_collage)
            VALUES (${id}, ${user.id}, ${sessionId || null}, ${photoUrl}, ${isStrip || false}, ${isCollage || false})
            ON CONFLICT (id) DO UPDATE
            SET photo_url = ${photoUrl}, updated_at = NOW()
        `;

        return new Response(JSON.stringify({
            success: true,
            photoId: id,
            photoUrl: photoUrl
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
