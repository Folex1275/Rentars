'use client';

import { useState } from 'react';
import ProfileManagement from '@/components/dashboard/ProfileManagement';
import PropertyManagement from '@/components/dashboard/PropertyManagement';
import PropertyCalendar from '@/components/dashboard/PropertyCalendar';

export default function ProfilePage() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const mockProperties = [
    {
      id: '1',
      title: 'Downtown Apartment',
      location: 'New York, NY',
      pricePerNight: 120,
    },
    {
      id: '2',
      title: 'Beach House',
      location: 'Miami, FL',
      pricePerNight: 200,
    },
  ];

  const mockProfile = {
    id: '1',
    email: 'user@example.com',
    name: 'John Doe',
    avatar_url: 'https://via.placeholder.com/150',
    phone: '+1 (555) 000-0000',
    address: '123 Main St, New York, NY',
    stellar_wallet: 'GBRPYHIL2CI3FV4BMSXIUQRX5ZLYJQJVXF7LYBJW5YIPJOCQG77UYUW',
    wallet_verified: true,
    role: 'both' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const handlePropertyEdit = (property: any) => {
    console.log('Edit property:', property);
  };

  const handlePropertyDelete = (id: string) => {
    console.log('Delete property:', id);
  };

  const handlePropertyAdd = () => {
    console.log('Add property');
  };

  const handleCalendarOpen = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setShowCalendar(true);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your profile and properties</p>
        </div>

        {/* Profile Management */}
        <ProfileManagement
          profile={mockProfile}
          onUpdate={(data) => console.log('Profile updated:', data)}
        />

        {/* Property Management */}
        <PropertyManagement
          properties={mockProperties}
          onAdd={handlePropertyAdd}
          onEdit={handlePropertyEdit}
          onDelete={handlePropertyDelete}
        />

        {/* Property Calendar */}
        {showCalendar && selectedPropertyId && (
          <PropertyCalendar
            propertyId={selectedPropertyId}
            onClose={() => setShowCalendar(false)}
          />
        )}
      </div>
    </main>
  );
}
