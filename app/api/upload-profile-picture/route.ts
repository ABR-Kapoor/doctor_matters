import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { createClient } from '@insforge/sdk';

export async function POST(request: NextRequest) {
    try {
        const insforge = createClient({
            baseUrl: process.env.INSFORGE_URL!,
            anonKey: process.env.INSFORGE_SERVICE_KEY!,
        });

        const formData = await request.formData();
        const file = formData.get('file');
        const uid = formData.get('uid') as string;

        if (!file || !uid) {
            return NextResponse.json({ error: 'File and UID required' }, { status: 400 });
        }

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Invalid file upload' }, { status: 400 });
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
        }

        const fileExt = file.name.split('.').pop();
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
