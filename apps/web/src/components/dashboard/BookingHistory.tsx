'use client';

import BookingCard from './components/BookingCard';

interface BookingHistoryProps {
  bookings: Array<{
    id: string;
    propertyTitle: string;
    location: string;
    checkIn: Date;
    checkOut: Date;
    totalPrice: number;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    escrowStatus: 'locked' | 'released' | 'refunded';
    thumbnail?: string;
  }>;
}

export default function BookingHistory({ bookings }: BookingHistoryProps) {
  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-500">No bookings yet. Start exploring properties!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bookings.map((booking) => (
        <BookingCard key={booking.id} {...booking} />
      ))}
    </div>
  );
}
