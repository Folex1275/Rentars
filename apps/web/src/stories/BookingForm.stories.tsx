import type { Meta, StoryObj } from '@storybook/react';
import BookingForm from '@/components/booking/BookingForm';

const meta: Meta<typeof BookingForm> = {
  title: 'Booking/BookingForm',
  component: BookingForm,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof BookingForm>;

export const Default: Story = {
  args: {
    propertyId: 'prop-1',
    pricePerNight: 120,
    onSubmit: (data) => console.log('Booking submitted:', data),
  },
};

export const Loading: Story = {
  args: { ...Default.args, isLoading: true },
};
