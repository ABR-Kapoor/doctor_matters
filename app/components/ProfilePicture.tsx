'use client';

import { useEffect, useState } from 'react';
import { useAuthToken } from '@/lib/auth-token-context';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

export default function ProfilePicture({ uid }: { uid?: string }) {
  const token = useAuthToken();
  const [profileImage, setProfileImage] = useState<string>('');
  const [profileName, setProfileName] = useState<string>('Doctor');

  useEffect(() => {
    fetchProfileImage();
  }, []);

  async function fetchProfileImage() {
    try {
      // First sync user to get UID
      const syncResponse = await fetchWithAuth('/api/sync-user', token);
      const { user } = await syncResponse.json();
      
      if (user?.uid) {
        setProfileName(user?.name || 'Doctor');
        const profileResponse = await fetchWithAuth(`/api/doctor/profile`, token);
        const data = await profileResponse.json();
        
        if (data.success && data.doctor?.profile_image_url) {
          setProfileImage(data.doctor.profile_image_url);
        }
      }
    } catch (error) {
      console.error('Error fetching profile image:', error);
    }
  }

  if (!profileImage) {
    const initials = profileName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'DR';

    return (
      <div className="w-full h-full rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={profileImage}
      alt="Profile"
      className="w-full h-full object-cover"
    />
  );
}
