// Photo View API
// Returns a photo by ID for public viewing/downloading

import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
    if (!process.env.DATABASE_URL) {
        return new Response('Database not configured', { status: 500 });
    }

    const sql = neon(process.env.DATABASE_URL);
    const url = new URL(req.url);
    const photoId = url.searchParams.get('id');

    if (!photoId) {
        return new Response('Photo ID required', { status: 400 });
    }

    try {
        // Get photo from database (photo_url contains the base64 data)
        const result = await sql`
            SELECT id, photo_url FROM photos WHERE id = ${photoId}
        `;

        if (result.length === 0) {
            return new Response('Photo not found in database', { status: 404 });
        }

        const photo = result[0];
        const photoData = photo.photo_url;

        if (!photoData) {
            return new Response('Photo data not found', { status: 404 });
        }

        // Check if it's base64 data
        if (photoData.startsWith('data:image')) {
            // Extract base64 data
            const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            return new Response(buffer, {
                headers: {
                    'Content-Type': 'image/jpeg',
                    'Content-Disposition': `inline; filename="photo-${photoId}.jpg"`,
                    'Cache-Control': 'public, max-age=31536000'
                }
            });
        } else {
            // It's a URL, redirect to it
            return Response.redirect(photoData, 302);
        }

    } catch (error) {
        console.error('Photo view error:', error);
        return new Response('Error loading photo: ' + error.message, { status: 500 });
    }
};

export const config = {
    path: "/api/photo"
};
