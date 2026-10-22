'use client';

import { createContext, useContext, ReactNode } from 'react';

const AuthTokenContext = createContext<string | null>(null);

export function AuthTokenProvider({ token, children }: { token: string | null; children: ReactNode }) {
    return <AuthTokenContext.Provider value={token}>{children}</AuthTokenContext.Provider>;
}

export function useAuthToken() {
    return useContext(AuthTokenContext);
}
