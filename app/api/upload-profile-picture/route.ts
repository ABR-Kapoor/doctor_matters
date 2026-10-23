import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { createClient } from '@insforge/sdk';
import { requireDoctor } from '@/lib/authz';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(request: NextRequest) {
    // This route had no authentication and took the target `uid` from the form
    // body, so anyone could overwrite any user's profile picture.
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const insforge = createClient({
            baseUrl: process.env.INSFORGE_URL!,
            anonKey: process.env.INSFORGE_SERVICE_KEY!,
        });

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'File required' }, { status: 400 });
        }

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Invalid file upload' }, { status: 400 });
        }

        // Exact-type allowlist. A `startsWith('image/')` check also accepted
        // things like `image/svg+xml`, which can carry script.
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            return NextResponse.json({ error: 'Only JPEG, PNG, WebP or GIF images are allowed' }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
        }

        // Derive the extension from the validated MIME type rather than the
        // client-supplied filename, so a crafted name cannot influence the
        // stored object key.
        const extByType: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif',
        };
        const fileExt = extByType[file.type] ?? 'bin';

        // The target is always the authenticated doctor.
        const uid = auth.data.uid;
        const fileName = `${uid}-${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await (insforge.storage
            .from('avatar') as any)
            .upload(fileName, file, {
                contentType: file.type,
            });

        if (uploadError) {
            console.error('InsForge Storage upload error:', uploadError);
            return NextResponse.json({ error: 'Failed to upload file to InsForge Storage' }, { status: 500 });
        }

        const filePath = (uploadData as any)?.path ?? (uploadData as any)?.key ?? fileName;
        const publicUrl = (insforge.storage.from('avatar') as any).getPublicUrl(filePath);

        await sql`UPDATE users SET profile_image_url = ${publicUrl} WHERE uid = ${uid}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            message: 'Profile picture updated successfully',
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Failed to upload profile picture' }, { status: 500 });
    }
}
