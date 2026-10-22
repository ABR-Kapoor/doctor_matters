import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import DashboardLayoutClient from '@/app/components/DashboardLayoutClient';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();

    if (!userId) {
        redirect('/');
    }

    // Get user from Clerk
    const clerkUser = await currentUser();

    const user = clerkUser ? {
        id: userId,
        email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
        given_name: clerkUser.firstName || '',
        family_name: clerkUser.lastName || '',
        picture: clerkUser.imageUrl || '',
    } : null;

    const { getToken } = await auth();
    const accessToken = await getToken() || '';

    return (
        <DashboardLayoutClient user={user} accessToken={accessToken}>
            {children}
        </DashboardLayoutClient>
    );
}
