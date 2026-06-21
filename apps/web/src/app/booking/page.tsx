'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import BookingForm from '@/components/booking/BookingForm';
import WalletConnectionModal from '@/components/booking/WalletConnectionModal';
import { isValidStellarAddress } from '@/lib/freighter-utils';

export default function BookingPage() {
  const router = useRouter();
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing wallet connection on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress && isValidStellarAddress(savedAddress)) {
      setWalletAddress(savedAddress);
      setWalletConnected(true);
    }
  }, []);

  const handleBookingSubmit = async (data: {
    checkIn: Date;
    checkOut: Date;
    guestCount: number;
  }) => {
    if (!walletConnected || !walletAddress) {
      setShowWalletModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/bookings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            property_id: 'property-id', // Would come from URL params
            check_in: data.checkIn.toISOString(),
            check_out: data.checkOut.toISOString(),
            guest_count: data.guestCount,
            wallet_address: walletAddress,
          }),
        }
      );

      if (response.ok) {
        const booking = await response.json();
        router.push(`/booking/confirmation/${booking.id}`);
      } else {
        alert('Booking failed');
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Error creating booking');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletConnect = (address: string) => {
    setWalletAddress(address);
    setWalletConnected(true);
  };

  const handleWalletDisconnect = () => {
    localStorage.removeItem('walletAddress');
    setWalletAddress(null);
    setWalletConnected(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Booking</h1>
        <p className="text-gray-600 mb-8">
          Select your dates and connect your wallet to secure your reservation.
        </p>

        {/* Wallet Status Card */}
        <div className="mb-6">
          {walletConnected && walletAddress ? (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-green-900">Wallet Connected</p>
                <p className="text-xs text-green-700 mt-1 font-mono break-all">{walletAddress}</p>
                <button
                  onClick={handleWalletDisconnect}
                  className="text-xs text-green-600 hover:text-green-700 mt-2 underline"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-900">Wallet Not Connected</p>
                <p className="text-xs text-amber-700 mt-1">
                  You'll need to connect your wallet to complete booking.
                </p>
              </div>
            </div>
          )}
        </div>

        <BookingForm
          propertyId="property-id"
          pricePerNight={100}
          onSubmit={handleBookingSubmit}
          isLoading={isLoading}
        />
      </div>

      <WalletConnectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleWalletConnect}
      />
    </main>
  );
}
