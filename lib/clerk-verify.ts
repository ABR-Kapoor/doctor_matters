import { auth, currentUser } from '@clerk/nextjs/server';
import { verifyToken, createClerkClient } from '@clerk/backend';

export interface ClerkUser {
    id: string | null;
    email: string | null;
    given_name: string | null;
    family_name: string | null;
    picture: string | null;
}

export async function verifyClerkUser(req?: Request): Promise<ClerkUser | null> {
    try {
        // 1. Try bearer token from request headers (mobile clients)
        if (req) {
            const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
            if (!authHeader) {
                console.warn('[verifyClerkUser] No Authorization header present on request');
            } else if (authHeader.startsWith('Bearer ')) {
                const token = authHeader.replace(/^Bearer\s+/i, '').trim();
                if (!token) {
                    console.warn('[verifyClerkUser] Bearer token is empty');
                } else if (token.startsWith('user_')) {
                    console.warn('[verifyClerkUser] Token appears to be a user ID instead of JWT');
                } else {
                    try {
                        const verifiedToken = await verifyToken(token, {
                            secretKey: process.env.CLERK_SECRET_KEY,
                            jwtKey: process.env.CLERK_JWT_KEY,
                        });
                        const userId = verifiedToken.sub;
                        if (userId) {
                            try {
                                const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
                                const user = await clerk.users.getUser(userId);
                                return {
                                    id: userId,
                                    email: user.emailAddresses?.[0]?.emailAddress || null,
                                    given_name: user.firstName || null,
                                    family_name: user.lastName || null,
                                    picture: user.imageUrl || null,
                                };
                            } catch (userErr: any) {
                                return {
                                    id: userId,
                                    email: (verifiedToken as any).email || null,
                                    given_name: (verifiedToken as any).first_name || null,
                                    family_name: (verifiedToken as any).last_name || null,
                                    picture: null,
                                };
                            }
                        }
                    } catch (tokenErr: any) {
                        console.warn('[verifyClerkUser] Token verification error:', tokenErr.message || tokenErr);
                    }
                }
            }
        }

        // 2. Fall back to standard session auth() (web cookies)
        const { userId } = await auth();

        if (!userId) {
            return null;
        }

        const user = await currentUser();

        if (!user) {
            return {
                id: userId,
                email: null,
                given_name: null,
                family_name: null,
                picture: null,
            };
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
