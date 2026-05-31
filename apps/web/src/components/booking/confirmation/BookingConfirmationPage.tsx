'use client';

import { useBookingDetails } from '@/hooks/useBookingDetails';
import { useEscrowStatus } from '@/hooks/useEscrowStatus';
import EscrowStatusCard from './EscrowStatusCard';
import { Mail, Phone } from 'lucide-react';

interface BookingConfirmationPageProps {
  bookingId: string;
}

export default function BookingConfirmationPage({
  bookingId,
}: BookingConfirmationPageProps) {
  const { booking, isLoading } = useBookingDetails(bookingId);
  const { escrow } = useEscrowStatus(bookingId);

  if (isLoading) {
    return <div className="text-center py-8">Loading booking details...</div>;
  }

  if (!booking) {
    return <div className="text-center py-8 text-red-600">Booking not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Details</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">Check-in</p>
            <p className="font-semibold">
              {new Date(booking.check_in).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Check-out</p>
            <p className="font-semibold">
              {new Date(booking.check_out).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Guests</p>
            <p className="font-semibold">{booking.guest_count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Price</p>
            <p className="font-semibold text-blue-600">{booking.total_price} USDC</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm text-gray-600 mb-2">Status</p>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              booking.status === 'confirmed'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </span>
        </div>
      </div>

      {escrow && (
        <EscrowStatusCard
          status={escrow.status}
          amount={escrow.amount}
          releaseDate={escrow.releaseDate}
        />
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Host Contact</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-gray-400" />
            <span className="text-gray-600">host@example.com</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone size={18} className="text-gray-400" />
            <span className="text-gray-600">+1 (555) 000-0000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
