'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import BookingStats from './components/BookingStats';
import EarningsStats from './components/EarningsStats';
import PaymentMethods from './components/PaymentMethods';
import PayoutHistory from './components/PayoutHistory';
import RecentTransactions from './components/RecentTransactions';
import AvailableBalance from './components/AvailableBalance';
import AddPropertyModal from './components/AddPropertyModal';
import PropertyList from './components/PropertyList';
import { mockHostData } from './mockData';

export default function HostDashboard() {
  const [showAddProperty, setShowAddProperty] = useState(false);

  const handleAddProperty = (data: {
    title: string;
    location: string;
    pricePerNight: number;
    description: string;
  }) => {
    console.log('Adding property:', data);
    setShowAddProperty(false);
    // API call would go here
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Host Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your properties and earnings</p>
          </div>
          <button
            onClick={() => setShowAddProperty(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            <Plus size={20} />
            Add Property
          </button>
        </div>

        {/* Available Balance */}
        <AvailableBalance
          amount={mockHostData.earningsStats.pendingPayout}
          onWithdraw={() => console.log('Withdraw clicked')}
        />

        {/* Stats */}
        <BookingStats {...mockHostData.bookingStats} />
        <EarningsStats {...mockHostData.earningsStats} />

        {/* Properties */}
        <PropertyList properties={mockHostData.properties} />

        {/* Transactions and Payouts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTransactions transactions={mockHostData.recentTransactions} />
          <PayoutHistory payouts={mockHostData.payoutHistory} />
        </div>

        {/* Payment Methods */}
        <PaymentMethods onAddMethod={() => console.log('Add payment method')} />
      </div>

      <AddPropertyModal
        isOpen={showAddProperty}
        onClose={() => setShowAddProperty(false)}
        onSubmit={handleAddProperty}
      />
    </main>
  );
}
