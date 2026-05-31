'use client';

import { useState } from 'react';
import { Calendar, Users } from 'lucide-react';

interface BookingFormProps {
  propertyId: string;
  pricePerNight: number;
  onSubmit: (data: {
    checkIn: Date;
    checkOut: Date;
    guestCount: number;
  }) => void;
  isLoading?: boolean;
}

export default function BookingForm({
  propertyId,
  pricePerNight,
  onSubmit,
  isLoading = false,
}: BookingFormProps) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestCount, setGuestCount] = useState(1);

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const nights = calculateNights();
  const totalPrice = nights * pricePerNight;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut || nights <= 0) {
      alert('Please select valid dates');
      return;
    }
    onSubmit({
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guestCount,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="inline mr-2" size={16} />
            Check-in
          </label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="inline mr-2" size={16} />
            Check-out
          </label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Users className="inline mr-2" size={16} />
          Guests
        </label>
        <input
          type="number"
          min="1"
          value={guestCount}
          onChange={(e) => setGuestCount(parseInt(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{pricePerNight} USDC × {nights} nights</span>
          <span className="font-medium">{totalPrice} USDC</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-blue-600">{totalPrice} USDC</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || nights <= 0}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
      >
        {isLoading ? 'Processing...' : 'Book Now'}
      </button>
    </form>
  );
}
