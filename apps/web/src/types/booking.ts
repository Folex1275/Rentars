export interface Booking {
  id: string;
  property_id: string;
  tenant_id: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  escrow_status: 'locked' | 'released' | 'refunded';
  created_at: string;
  updated_at: string;
}

export interface BookingFormData {
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  propertyId: string;
}
