import { auth, currentUser } from '@clerk/nextjs/server';

export interface ClerkUser {
    id: string | null;
    email: string | null;
    given_name: string | null;
    family_name: string | null;
    picture: string | null;
}

export async function verifyClerkUser(): Promise<ClerkUser | null> {
    try {
        const { userId } = await auth();

        if (!userId) {
            return null;
        }

        const user = await currentUser();

        if (!user) {
            return null;
        }

        return {
            id: userId,
            email: user.emailAddresses?.[0]?.emailAddress || null,
            given_name: user.firstName || null,
            family_name: user.lastName || null,
            picture: user.imageUrl || null,
        };
    } catch (error: any) {
        console.error('[verifyClerkUser] Error:', error.message || error);
        return null;
    }
}
