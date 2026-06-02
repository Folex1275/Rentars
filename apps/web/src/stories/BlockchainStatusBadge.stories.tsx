import type { Meta, StoryObj } from '@storybook/react';
import BlockchainStatusBadge from '@/components/blockchain/BlockchainStatusBadge';

const meta: Meta<typeof BlockchainStatusBadge> = {
  title: 'Blockchain/BlockchainStatusBadge',
  component: BlockchainStatusBadge,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof BlockchainStatusBadge>;

export const Verified: Story = {
  args: { status: { verified: true, pending: false, hash: 'abc123', lastVerified: new Date().toISOString() } },
};

export const Pending: Story = {
  args: { status: { verified: false, pending: true, hash: null, lastVerified: null } },
};

export const Unverified: Story = {
  args: { status: { verified: false, pending: false, hash: null, lastVerified: null } },
};
