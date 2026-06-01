import type { Meta, StoryObj } from '@storybook/react';
import PropertyGrid from '@/components/search/PropertyGrid';

const meta: Meta<typeof PropertyGrid> = {
  title: 'Search/PropertyGrid',
  component: PropertyGrid,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof PropertyGrid>;

const makeProperty = (id: string, title: string, available = true) => ({
  id,
  title,
  location: 'Miami, FL',
  price_per_night: 100 + Number(id) * 10,
  available,
  images: [],
  owner_id: 'owner-1',
  description: 'A great place to stay.',
  created_at: new Date().toISOString(),
});

export const WithProperties: Story = {
  args: {
    properties: [
      makeProperty('1', 'Beach House'),
      makeProperty('2', 'City Loft'),
      makeProperty('3', 'Mountain Cabin', false),
    ],
  },
};

export const Empty: Story = { args: { properties: [] } };
