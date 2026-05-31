'use client';

import { useState } from 'react';
import { Upload, Check, AlertCircle } from 'lucide-react';
import type { UserProfile, ProfileUpdateData } from '@/types/profile';

interface ProfileManagementProps {
  profile?: UserProfile;
  onUpdate?: (data: ProfileUpdateData) => void;
}

export default function ProfileManagement({
  profile,
  onUpdate,
}: ProfileManagementProps) {
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    stellarWallet: profile?.stellar_wallet || '',
  });
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerifyWallet = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).freighter) {
        const publicKey = await (window as any).freighter.getPublicKey();
        setFormData({ ...formData, stellarWallet: publicKey });
        setMessage({ type: 'success', text: 'Wallet verified successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Freighter wallet not found' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to verify wallet' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/profile`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            stellar_wallet: formData.stellarWallet,
            avatar_url: avatarPreview,
          }),
        }
      );

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        onUpdate?.({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          stellar_wallet: formData.stellarWallet,
          avatar_url: avatarPreview,
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating profile' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Management</h2>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Avatar
          </label>
          <div className="flex items-center gap-4">
            {avatarPreview && (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition">
              <Upload size={18} />
              <span className="text-sm font-medium">Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        {/* Stellar Wallet */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stellar Wallet Address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.stellarWallet}
              readOnly
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
              placeholder="Connect wallet to link"
            />
            <button
              type="button"
              onClick={handleVerifyWallet}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              Link Wallet
            </button>
          </div>
          {profile?.wallet_verified && (
            <div className="mt-2 flex items-center gap-2 text-green-600 text-sm">
              <Check size={16} />
              Wallet verified
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
