import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import WalletConnectionModal from '../WalletConnectionModal';
import * as freighterUtils from '@/lib/freighter-utils';

// Mock the freighter utilities
vi.mock('@/lib/freighter-utils', () => ({
  connectFreighterWallet: vi.fn(),
  isValidStellarAddress: vi.fn((addr) => /^G[A-Z2-7]{55}$/.test(addr)),
  FreighterError: class FreighterError extends Error {
    constructor(message: string, code: string = 'NETWORK_ERROR') {
      super(message);
      this.name = 'FreighterError';
      this.code = code;
    }
  },
}));

describe('WalletConnectionModal', () => {
  const mockOnClose = vi.fn();
  const mockOnConnect = vi.fn();
  const mockPublicKey = 'GTEST123456789012345678901234567890123456789012345678';
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConnect: mockOnConnect,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('does not render when closed', () => {
      render(<WalletConnectionModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText(/connect your wallet/i)).not.toBeInTheDocument();
    });

    it('renders connect button when open', () => {
      render(<WalletConnectionModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /connect freighter wallet/i })).toBeInTheDocument();
    });

    it('displays Freighter install link', () => {
      render(<WalletConnectionModal {...defaultProps} />);

      const link = screen.getByRole('link', { name: /install it here/i });
      expect(link).toHaveAttribute('href', 'https://www.freighter.app');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('displays network info', () => {
      render(<WalletConnectionModal {...defaultProps} />);

      expect(screen.getByText(/stellar testnet/i)).toBeInTheDocument();
    });
  });

  describe('Connection Success', () => {
    it('connects successfully and calls callbacks', async () => {
      const user = userEvent.setup({ delay: null });
      vi.mocked(freighterUtils.connectFreighterWallet).mockResolvedValue(mockPublicKey);

      render(<WalletConnectionModal {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/wallet connected/i)).toBeInTheDocument();
      });

      // Advance timers to trigger callbacks
      vi.runAllTimers();

      expect(mockOnConnect).toHaveBeenCalledWith(mockPublicKey);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('saves wallet address to localStorage', async () => {
      const user = userEvent.setup({ delay: null });
      vi.mocked(freighterUtils.connectFreighterWallet).mockResolvedValue(mockPublicKey);

      render(<WalletConnectionModal {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(localStorage.getItem('walletAddress')).toBe(mockPublicKey);
      });
    });

    it('shows connected address on success', async () => {
      const user = userEvent.setup({ delay: null });
      vi.mocked(freighterUtils.connectFreighterWallet).mockResolvedValue(mockPublicKey);

      render(<WalletConnectionModal {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(mockPublicKey)).toBeInTheDocument();
      });
    });

    it('shows disconnect button when connected', async () => {
      const user = userEvent.setup({ delay: null });
      vi.mocked(freighterUtils.connectFreighterWallet).mockResolvedValue(mockPublicKey);

      render(<WalletConnectionModal {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /disconnect wallet/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles NOT_INSTALLED error', async () => {
      const user = userEvent.setup({ delay: null });
      const error = new (freighterUtils as any).FreighterError(
        'Freighter not installed',
        'NOT_INSTALLED'
      );
      vi.mocked(freighterUtils.connectFreighterWallet).mockRejectedValue(error);

      render(<WalletConnectionModal {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/freighter wallet is not installed/i)).toBeInTheDocument();
      });
    });

    it('handles NOT_CONNECTED error', async () => {
      const user = userEvent.setup({ delay: null });
      const error = new (freighterUtils as any).FreighterError(
        'Wallet not connected',
        'NOT_CONNECTED'
      );
      vi.mocked(freighterUtils.connectFreighterWallet).mockRejectedValue(error);

      render(<WalletConnectionModal {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/wallet is not connected in freighter/i)).toBeInTheDocument();
      });
    });

    it('handles USER_REJECTED error', async () => {
      const user = userEvent.setup({ delay: null });
      const error = new (freighterUtils as any).FreighterError(
        'User rejected',
        'USER_REJECTED'
      );
      vi.mocked(freighterUtils.connectFreighterWallet).mockRejectedValue(error);

      render(<WalletConnectionModal {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/you rejected the connection request/i)).toBeInTheDocument();
      });
    });

    it('shows try again button on error', async () => {
      const user = userEvent.setup({ delay: null });
      vi.mocked(freighterUtils.connectFreighterWallet).mockRejectedValue(
        new Error('Connection failed')
      );

      render(<WalletConnectionModal {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('allows retry after error', async () => {
      const user = userEvent.setup({ delay: null });
      vi.mocked(freighterUtils.connectFreighterWallet)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(mockPublicKey);

      render(<WalletConnectionModal {...defaultProps} />);

      // First attempt
      let connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });

      // Retry
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByText(/wallet connected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Disconnection', () => {
    it('disconnects wallet', async () => {
      const user = userEvent.setup({ delay: null });
      localStorage.setItem('walletAddress', mockPublicKey);

      render(<WalletConnectionModal {...defaultProps} />);

      // Wait for component to load saved address
      await waitFor(() => {
        expect(screen.getByText(mockPublicKey)).toBeInTheDocument();
      });

      const disconnectButton = screen.getByRole('button', { name: /disconnect wallet/i });
      await user.click(disconnectButton);

      expect(localStorage.getItem('walletAddress')).toBeNull();
      expect(screen.queryByText(mockPublicKey)).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /connect freighter wallet/i })
      ).toBeInTheDocument();
    });
  });

  describe('Modal Controls', () => {
    it('closes modal with X button', async () => {
      const user = userEvent.setup({ delay: null });

      render(<WalletConnectionModal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('prevents closing during connection', async () => {
      const user = userEvent.setup({ delay: null });
      let resolveConnection: (value: string) => void;
      const connectionPromise = new Promise<string>((resolve) => {
        resolveConnection = resolve;
      });

      vi.mocked(freighterUtils.connectFreighterWallet).mockReturnValue(connectionPromise);

      render(<WalletConnectionModal {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
      await user.click(connectButton);

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toBeDisabled();

      // Resolve the connection
      resolveConnection!(mockPublicKey);
      vi.runAllTimers();
    });

    it('shows loading state during connection', async () => {
      const user = userEvent.setup({ delay: null });
      let resolveConnection: (value: string) => void;
      const connectionPromise = new Promise<string>((resolve) => {
        resolveConnection = resolve;
      });

      vi.mocked(freighterUtils.connectFreighterWallet).mockReturnValue(connectionPromise);

      render(<WalletConnectionModal {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
      await user.click(connectButton);

      expect(screen.getByRole('button', { name: /connecting/i })).toBeDisabled();

      resolveConnection!(mockPublicKey);
      vi.runAllTimers();
    });
  });

  describe('Existing Connection', () => {
    it('shows connected state with saved address', () => {
      localStorage.setItem('walletAddress', mockPublicKey);

      render(<WalletConnectionModal {...defaultProps} />);

      expect(screen.getByText(/wallet connected/i)).toBeInTheDocument();
      expect(screen.getByText(mockPublicKey)).toBeInTheDocument();
    });

    it('ignores invalid saved address', () => {
      localStorage.setItem('walletAddress', 'invalid-address');

      render(<WalletConnectionModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /connect freighter wallet/i })).toBeInTheDocument();
    });
  });
});
