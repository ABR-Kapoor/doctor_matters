'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PanelLeftClose, PanelLeftOpen, BadgeCheck } from 'lucide-react';
import ProfilePicture from '@/app/components/ProfilePicture';
import { TranslatedText } from '@/app/components/TranslatedText';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import SidebarNavigation from '@/app/components/SidebarNavigation';
import { useTranslation } from '@/app/hooks/useTranslation';
import { useAuthToken } from '@/lib/auth-token-context';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

import { useProfileStore } from '@/app/store/useProfileStore';

interface CollapsibleSidebarProps {
  user: any;
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  showCollapseToggle?: boolean;
}

export default function CollapsibleSidebar({ user, isCollapsed, setIsCollapsed, showCollapseToggle = true }: CollapsibleSidebarProps) {
  const { text: collapseLabel } = useTranslation('Collapse sidebar');
  const { text: expandLabel } = useTranslation('Expand sidebar');
  const token = useAuthToken();
  const profileStore = useProfileStore();

  useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      if (profileStore.isLoaded) return;
      try {
        const syncResponse = await fetchWithAuth('/api/sync-user', token);
        const { user: syncedUser } = await syncResponse.json();

        if (!syncedUser?.uid) return;

        const profileResponse = await fetchWithAuth(`/api/doctor/profile?uid=${syncedUser.uid}`, token);
        const data = await profileResponse.json();

        if (!active) return;

        const name = data?.user?.name || syncedUser?.name || user?.name || user?.given_name || 'Doctor';
        profileStore.setProfile({
          name,
          isVerified: Boolean(data?.doctor?.is_verified)
        });
      } catch {
        // Keep existing name on errors.
      }
    };

    fetchProfile();

    return () => {
      active = false;
    };
  }, [token, profileStore.isLoaded]);

  return (
    <aside
      className="w-full h-full flex flex-col bg-blue-50"
    >
      {/* Brand / Logo */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b border-blue-100 ${isCollapsed ? 'justify-center px-0' : ''}`}>
        <Link href="/dashboard" className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
          {isCollapsed ? (
            <img
              src="/AuraSutra-LogoOnly-Transparent.png"
              alt="AuraSutra"
              className="h-10 w-10 object-contain shrink-0"
            />
          ) : (
            <img
              src="/AuraSutra-Full_BlackText-Transparent.png"
              alt="AuraSutra"
              className="h-12 object-contain shrink-0"
            />
          )}
        </Link>

        {/* Collapse toggle — only shown on desktop sidebar */}
        {!isCollapsed && showCollapseToggle && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="ml-auto w-8 h-8 hidden lg:flex items-center justify-center rounded-xl text-blue-400 hover:text-blue-600 smooth-transition shrink-0"
            aria-label={collapseLabel}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="mx-auto mt-4 w-8 h-8 flex items-center justify-center rounded-xl text-blue-400 hover:text-blue-600 smooth-transition"
          aria-label={expandLabel}
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-4 space-y-0.5 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        <SidebarNavigation isCollapsed={isCollapsed} />
      </nav>

      {/* Language Switcher */}
      {!isCollapsed && (
        <div className="px-4 py-3">
          <LanguageSwitcher />
        </div>
      )}

      {/* Profile Footer — pill shaped */}
      <div className={`border-t border-blue-100 ${isCollapsed ? 'px-2 py-3 flex justify-center' : 'px-4 py-4'}`}>
        {isCollapsed ? (
          <div className="w-9 h-9 rounded-full bg-blue-200 overflow-hidden flex items-center justify-center relative">
            <ProfilePicture uid={user?.id} />
            {!user?.id && (
              <span className="text-blue-800 font-bold text-sm">
                {user?.given_name?.[0] || 'D'}
              </span>
            )}
            {profileStore.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-blue-100 rounded-full px-3 py-2 flex items-center gap-3 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] smooth-transition relative">
            <div className="w-8 h-8 rounded-full bg-blue-200 overflow-hidden shrink-0 flex items-center justify-center">
              <ProfilePicture uid={user?.id} />
              {!user?.id && (
                <span className="text-blue-800 font-bold text-xs">
                  {user?.given_name?.[0] || 'D'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs font-bold text-blue-900 truncate tracking-tight">{profileStore.isLoaded ? profileStore.name : (user?.name || user?.given_name || 'Doctor')}</p>
              <p className="text-[10px] text-blue-500 truncate">{user?.email}</p>
            </div>
            {profileStore.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0 mr-1" />}
          </div>
        )}
      </div>
    </aside>
  );
}
