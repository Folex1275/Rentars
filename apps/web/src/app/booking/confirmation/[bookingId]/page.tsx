'use client';

import BookingConfirmationPage from '@/components/booking/confirmation/BookingConfirmationPage';

interface ConfirmationPageProps {
  params: {
    bookingId: string;
  };
}

export default function ConfirmationPage({ params }: ConfirmationPageProps) {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <BookingConfirmationPage bookingId={params.bookingId} />
      </div>
    </main>
  );
}
