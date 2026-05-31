'use client';

import { useDashboard } from '@/hooks/useDashboard';
import BookingHistory from '@/components/dashboard/BookingHistory';
import Analytics from '@/components/dashboard/Analytics';
import NotificationSystem from '@/components/dashboard/NotificationSystem';
import WalletTransaction from './components/WalletTransaction';

export default function TenantDashboard() {
  const { bookings, isLoading, error } = useDashboard();

  const mockTransactions = [
    {
      id: '1',
      type: 'sent' as const,
      amount: 600,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      description: 'Booking payment - Downtown Apartment',
    },
    {
      id: '2',
      type: 'received' as const,
      amount: 100,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      description: 'Refund - Cancelled booking',
    },
  ];

  const formattedBookings = bookings.map((booking) => ({
    id: booking.id,
    propertyTitle: 'Property Name',
    location: 'City, State',
    checkIn: new Date(booking.check_in),
    checkOut: new Date(booking.check_out),
    totalPrice: booking.total_price,
    status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
    escrowStatus: booking.escrow_status as 'locked' | 'released' | 'refunded',
  }));

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tenant Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your bookings and transactions</p>
          </div>
          <NotificationSystem />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8 text-gray-500">
            Loading your dashboard...
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <>
            {/* Booking History */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Bookings</h2>
              <BookingHistory bookings={formattedBookings} />
            </div>

            {/* Analytics and Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Analytics />
              <WalletTransaction transactions={mockTransactions} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
