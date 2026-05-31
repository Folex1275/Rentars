'use client';

import { TrendingUp } from 'lucide-react';

interface BookingStatsProps {
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalReviews: number;
}

export default function BookingStats({
  activeBookings,
  completedBookings,
  cancelledBookings,
  totalReviews,
}: BookingStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <p className="text-sm text-gray-600 mb-1">Active Bookings</p>
        <p className="text-2xl font-bold text-gray-900">{activeBookings}</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <p className="text-sm text-gray-600 mb-1">Completed</p>
        <p className="text-2xl font-bold text-green-600">{completedBookings}</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <p className="text-sm text-gray-600 mb-1">Cancelled</p>
        <p className="text-2xl font-bold text-red-600">{cancelledBookings}</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600">Rating</p>
          <TrendingUp size={16} className="text-yellow-500" />
        </div>
        <p className="text-2xl font-bold text-yellow-600">{totalReviews}</p>
      </div>
    </div>
  );
}
