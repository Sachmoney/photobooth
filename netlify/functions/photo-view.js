// Photo View API
// Returns a photo by ID for public viewing/downloading

import { neon } from '@neondatabase/serverless';
import { getStore } from '@netlify/blobs';

const sql = neon(process.env.DATABASE_URL);

export default async (req, context) => {
    const url = new URL(req.url);
    const photoId = url.searchParams.get('id');

    if (!photoId) {
        return new Response('Photo ID required', { status: 400 });
    }

    try {
        // Get photo metadata from database
        const result = await sql`
            SELECT id, user_id, photo_url FROM photos WHERE id = ${photoId}
        `;

        if (result.length === 0) {
            return new Response('Photo not found', { status: 404 });
        }

        const photo = result[0];

        // Get photo from blob storage
        const store = getStore('photos');
        const blobKey = `${photo.user_id}/${photoId}.jpg`;

        const blob = await store.get(blobKey, { type: 'arrayBuffer' });

        if (!blob) {
            return new Response('Photo file not found', { status: 404 });
        }

        // Return the image
        return new Response(blob, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Content-Disposition': `inline; filename="photo-${photoId}.jpg"`,
                'Cache-Control': 'public, max-age=31536000'
            }
        });

    } catch (error) {
        console.error('Photo view error:', error);
        return new Response('Error loading photo', { status: 500 });
    }
};

export const config = {
    path: "/api/photo"
};
