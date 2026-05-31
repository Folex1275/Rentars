'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BookingForm from '@/components/booking/BookingForm';
import WalletConnectionModal from '@/components/booking/WalletConnectionModal';

export default function BookingPage() {
  const router = useRouter();
  const [walletConnected, setWalletConnected] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleBookingSubmit = async (data: {
    checkIn: Date;
    checkOut: Date;
    guestCount: number;
  }) => {
    if (!walletConnected) {
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
    localStorage.setItem('walletAddress', address);
    setWalletConnected(true);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Booking</h1>
        <p className="text-gray-600 mb-8">
          Select your dates and connect your wallet to secure your reservation.
        </p>

        <BookingForm
          propertyId="property-id"
          pricePerNight={100}
          onSubmit={handleBookingSubmit}
          isLoading={isLoading}
        />

        {walletConnected && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            ✓ Wallet connected
          </div>
        )}
      </div>

      <WalletConnectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleWalletConnect}
      />
    </main>
  );
}
