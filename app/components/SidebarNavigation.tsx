'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Calendar, Users, Pill, User, IndianRupee, LogOut, Lock } from 'lucide-react';
import { TranslatedText } from '@/app/components/TranslatedText';
import { useEffect, useState } from 'react';
import { useAuth, SignOutButton } from '@clerk/nextjs';

interface SidebarNavigationProps {
  isCollapsed?: boolean;
}

export default function SidebarNavigation({ isCollapsed = false }: SidebarNavigationProps) {
    const pathname = usePathname();

    const { userId } = useAuth();
    const [isFullyVerified, setIsFullyVerified] = useState(false);

    useEffect(() => {
        if (!userId) return;
        async function fetchCompletion() {
            try {
                const response = await fetch(`/api/doctor/profile/completion?uid=${userId}&t=${Date.now()}`, { cache: 'no-store' });
                const result = await response.json();
                if (result.success && result.isVerified) {
                    setIsFullyVerified(true);
                } else {
                    setIsFullyVerified(false);
                }
            } catch (error) {
                console.error('Failed to fetch completion:', error);
            }
        }
        fetchCompletion();
    }, [userId]);

    const items = [
        { name: 'Dashboard', href: '/dashboard', icon: Home, restricted: true },
        { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar, restricted: true },
        { name: 'Patients', href: '/dashboard/patients', icon: Users, restricted: true },
        { name: 'Prescriptions', href: '/dashboard/prescriptions', icon: Pill, restricted: true },
        { name: 'Finance', href: '/dashboard/finance', icon: IndianRupee, restricted: true },
        { name: 'Profile', href: '/dashboard/profile', icon: User, restricted: false },
    ];

    return (
        <>
            {items.map((item) => {
                // Adjust active logic: simple exact match or startsWith for sub-routes
                const isActive = pathname === item.href || (pathname?.startsWith(item.href) && item.href !== '/dashboard');
                const isLocked = item.restricted && !isFullyVerified;

                return (
                    <Link
                        key={item.name}
                        href={isLocked ? '#' : item.href}
                        className={`
              flex items-center rounded-full smooth-transition group
              ${isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'space-x-3 px-3 py-2.5'}
              ${isActive
                                ? 'bg-white text-blue-800 shadow-sm border border-blue-100 font-medium'
                                : isLocked ? 'text-gray-400 opacity-60 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100/70 hover:text-blue-800 font-medium'}
            `}
                        title={isCollapsed ? item.name : undefined}
                        onClick={e => { if (isLocked) e.preventDefault(); }}
                    >
                        <item.icon className={`w-5 h-5 shrink-0 transition-all duration-200 ${isActive ? 'text-blue-600' : isLocked ? 'text-gray-400' : 'text-blue-400 group-hover:text-blue-600'}`} />
                        {!isCollapsed && <span className="text-sm flex-1"><TranslatedText>{item.name}</TranslatedText></span>}
                        {!isCollapsed && isLocked && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                    </Link>
                );
            })}
            
            <SignOutButton>
                <button
                    type="button"
                    className={`
                      flex items-center rounded-full smooth-transition w-full text-left group mt-4
                      ${isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'space-x-3 px-3 py-2.5'}
                      text-red-500 hover:bg-red-50 hover:text-red-700 font-medium
                    `}
                    title={isCollapsed ? 'Logout' : undefined}
                >
                    <LogOut className={`w-5 h-5 shrink-0 text-red-400 group-hover:text-red-600 transition-all duration-200`} />
                    {!isCollapsed && <span className="text-sm"><TranslatedText>Logout</TranslatedText></span>}
                </button>
            </SignOutButton>
        </>
    );
}
