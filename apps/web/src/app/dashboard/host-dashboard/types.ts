export interface HostProperty {
  id: string;
  title: string;
  location: string;
  pricePerNight: number;
  bookings: number;
  rating: number;
  image: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: Date;
  description: string;
}

export interface PayoutRecord {
  id: string;
  amount: number;
  date: Date;
  status: 'pending' | 'completed' | 'failed';
  method: string;
}
