'use client';

import { CheckCircle } from 'lucide-react';

interface BookingConfirmationProps {
  bookingId: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
}

export default function BookingConfirmation({
  bookingId,
  propertyTitle,
  checkIn,
  checkOut,
  totalPrice,
}: BookingConfirmationProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 text-center space-y-4">
      <CheckCircle className="mx-auto text-green-600" size={48} />
      <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
      <p className="text-gray-600">Your booking has been created and is pending confirmation.</p>

      <div className="bg-gray-50 p-4 rounded-lg text-left space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Booking ID:</span>
          <span className="font-mono text-sm">{bookingId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Property:</span>
          <span className="font-medium">{propertyTitle}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Check-in:</span>
          <span>{new Date(checkIn).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Check-out:</span>
          <span>{new Date(checkOut).toLocaleDateString()}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Total:</span>
          <span className="text-blue-600">{totalPrice} USDC</span>
        </div>
      </div>

      <a
        href="/dashboard/tenant-dashboard"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition"
      >
        View My Bookings
      </a>
    </div>
  );
}
