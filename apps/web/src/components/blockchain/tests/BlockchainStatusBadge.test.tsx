import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BlockchainStatusBadge from '../BlockchainStatusBadge';
import type { BlockchainStatus } from '@/services/blockchain';

const base: BlockchainStatus = { verified: false, hash: null, lastVerified: null, pending: false };

describe('BlockchainStatusBadge', () => {
  it('renders verified badge with green colour', () => {
    render(<BlockchainStatusBadge status={{ ...base, verified: true }} />);
    const badge = screen.getByText('Verified').closest('div');
    expect(badge).toHaveClass('bg-green-100', 'text-green-700');
  });

  it('renders pending badge with yellow colour', () => {
    render(<BlockchainStatusBadge status={{ ...base, pending: true }} />);
    const badge = screen.getByText('Verifying...').closest('div');
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-700');
  });

  it('renders unverified badge with gray colour', () => {
    render(<BlockchainStatusBadge status={base} />);
    const badge = screen.getByText('Unverified').closest('div');
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-600');
  });
});
