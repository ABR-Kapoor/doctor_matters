'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import CollapsibleSidebar from '@/app/components/CollapsibleSidebar';
import ProfileBanner from '@/app/components/ProfileBanner';
import EmergencyBanner from '@/app/components/EmergencyBanner';
import { AuthTokenProvider } from '@/lib/auth-token-context';

interface DashboardLayoutClientProps {
  user: any;
  accessToken?: string | null;
  children: React.ReactNode;
}



export default function DashboardLayoutClient({ user, accessToken, children }: DashboardLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <AuthTokenProvider token={accessToken || null}>
      <div className="min-h-screen flex bg-blue-50 lg:bg-white">
        {/* Desktop Sidebar - sticky, always visible on large screens */}
        <div
          className="hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen border-r border-blue-100 transition-all duration-300"
          style={{ width: isCollapsed ? '72px' : '18rem' }}
        >
          <CollapsibleSidebar
            user={user}
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
          />
        </div>

        {/* Mobile Sidebar - overlay */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="absolute right-0 top-0 bottom-0 w-[min(18rem,85vw)] bg-blue-50 shadow-lg z-50 overflow-y-auto">
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="absolute top-[1.35rem] right-4 p-2 hover:bg-blue-100 rounded-lg z-50"
              >
                <X className="w-5 h-5 text-blue-600" />
              </button>
              <CollapsibleSidebar
                user={user}
                isCollapsed={false}
                setIsCollapsed={() => {}}
                showCollapseToggle={false}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-blue-100 shrink-0">
            <div className="flex items-center">
              <img src="/AuraSutra-Full_BlackText-Transparent.png" alt="AuraSutra" className="h-11 object-contain" />
            </div>
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 hover:bg-blue-50 rounded-lg"
            >
              <Menu className="w-5 h-5 text-blue-700" />
            </button>
          </div>

          <ProfileBanner user={user} uid={user?.id} />

          <EmergencyBanner />

          {/* Content */}
          <main className="flex-1 overflow-auto bg-slate-50/20">
            <div className="w-full min-h-full flex flex-col py-4 sm:py-6 md:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthTokenProvider>
  );
}
