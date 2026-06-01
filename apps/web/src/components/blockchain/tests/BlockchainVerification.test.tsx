import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BlockchainVerification from '../BlockchainVerification';
import * as blockchainService from '@/services/blockchain';

vi.mock('@/services/blockchain');

const mockGetStatus = vi.mocked(blockchainService.getBlockchainStatus);
const mockVerify = vi.mocked(blockchainService.verifyProperty);

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe('BlockchainVerification', () => {
  it('shows verified state with green badge and hash', async () => {
    mockGetStatus.mockResolvedValue({
      verified: true,
      hash: '0xabc123',
      lastVerified: '2024-01-01T00:00:00Z',
      pending: false,
    });

    render(<BlockchainVerification propertyId="prop-1" />);

    await waitFor(() => expect(screen.getByText('Blockchain Verified')).toBeInTheDocument());
    expect(screen.getByText('0xabc123')).toBeInTheDocument();
  });

  it('shows unverified state with warning', async () => {
    mockGetStatus.mockResolvedValue({ verified: false, hash: null, lastVerified: null, pending: false });

    render(<BlockchainVerification propertyId="prop-1" />);

    await waitFor(() => expect(screen.getByText('Not Verified')).toBeInTheDocument());
    expect(screen.getByText('Verify Now')).toBeInTheDocument();
  });

  it('shows pending state', async () => {
    mockGetStatus.mockResolvedValue({ verified: false, hash: null, lastVerified: null, pending: true });

    render(<BlockchainVerification propertyId="prop-1" />);

    await waitFor(() => expect(screen.getByText('Pending...')).toBeInTheDocument());
  });

  it('"Verify Now" button calls verification API', async () => {
    mockGetStatus.mockResolvedValue({ verified: false, hash: null, lastVerified: null, pending: false });
    mockVerify.mockResolvedValue({ verified: true, hash: '0xnew', lastVerified: null, pending: false });

    render(<BlockchainVerification propertyId="prop-1" />);

    await waitFor(() => screen.getByText('Verify Now'));
    fireEvent.click(screen.getByText('Verify Now'));

    await waitFor(() => expect(mockVerify).toHaveBeenCalledWith('prop-1'));
    expect(screen.getByText('Blockchain Verified')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    mockGetStatus.mockRejectedValue(new Error('Network error'));

    render(<BlockchainVerification propertyId="prop-1" />);

    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('hash copy-to-clipboard works', async () => {
    mockGetStatus.mockResolvedValue({
      verified: true,
      hash: '0xabc123',
      lastVerified: null,
      pending: false,
    });

    render(<BlockchainVerification propertyId="prop-1" />);

    await waitFor(() => screen.getByTitle('Copy hash'));
    fireEvent.click(screen.getByTitle('Copy hash'));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0xabc123');
  });
});
