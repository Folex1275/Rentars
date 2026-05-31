export const mockHostData = {
  bookingStats: {
    activeBookings: 5,
    completedBookings: 42,
    cancelledBookings: 2,
    totalReviews: 4.8,
  },
  earningsStats: {
    thisMonth: 2450,
    lastMonth: 1890,
    totalEarnings: 15230,
    pendingPayout: 450,
  },
  properties: [
    {
      id: '1',
      title: 'Cozy Downtown Apartment',
      location: 'New York, NY',
      pricePerNight: 120,
      bookings: 8,
      rating: 4.9,
      image: 'https://via.placeholder.com/300x200',
    },
    {
      id: '2',
      title: 'Beach House',
      location: 'Miami, FL',
      pricePerNight: 200,
      bookings: 12,
      rating: 4.7,
      image: 'https://via.placeholder.com/300x200',
    },
  ],
  recentTransactions: [
    {
      id: '1',
      type: 'booking_confirmed',
      amount: 600,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      description: 'Booking confirmed - Downtown Apartment',
    },
    {
      id: '2',
      type: 'payout',
      amount: 1200,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      description: 'Payout to bank account',
    },
  ],
  payoutHistory: [
    {
      id: '1',
      amount: 1200,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'completed',
      method: 'Bank Transfer',
    },
    {
      id: '2',
      amount: 950,
      date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      status: 'completed',
      method: 'Bank Transfer',
    },
  ],
};
