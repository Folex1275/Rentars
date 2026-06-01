import type { Meta, StoryObj } from '@storybook/react';
import PropertyCard from '@/components/search/PropertyCard';

const meta: Meta<typeof PropertyCard> = {
  title: 'Search/PropertyCard',
  component: PropertyCard,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof PropertyCard>;

const base = {
  id: '1',
  title: 'Cozy Beach House',
  location: 'Miami, FL',
  price_per_night: 120,
  available: true,
  images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'],
  owner_id: 'owner-1',
  description: 'A beautiful beach house with ocean views.',
  created_at: new Date().toISOString(),
};

export const Available: Story = { args: { property: base } };

export const Booked: Story = {
  args: { property: { ...base, available: false } },
};

export const NoImage: Story = {
  args: { property: { ...base, images: [] } },
};
