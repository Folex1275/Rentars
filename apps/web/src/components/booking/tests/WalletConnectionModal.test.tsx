import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import WalletConnectionModal from '../WalletConnectionModal';

// Mock window.freighter
const mockFreighter = {
  getPublicKey: vi.fn(),
};

describe('WalletConnectionModal', () => {
  const mockOnClose = vi.fn();
  const mockOnConnect = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConnect: mockOnConnect,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).freighter;
  });

  it('does not render when closed', () => {
    render(<WalletConnectionModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText(/connect wallet/i)).not.toBeInTheDocument();
  });

  it('shows Freighter install link when not installed', () => {
    render(<WalletConnectionModal {...defaultProps} />);
    
    expect(screen.getByText(/don't have freighter/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /install it here/i })).toHaveAttribute('href', 'https://www.freighter.app');
  });

  it('shows connect button when installed', () => {
    (window as any).freighter = mockFreighter;
    render(<WalletConnectionModal {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /connect freighter wallet/i })).toBeInTheDocument();
  });

  it('closes on successful connection', async () => {
    const user = userEvent.setup();
    const mockPublicKey = 'GTEST123';
    mockFreighter.getPublicKey.mockResolvedValue(mockPublicKey);
    (window as any).freighter = mockFreighter;
    
    render(<WalletConnectionModal {...defaultProps} />);
    
    const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
    await user.click(connectButton);
    
    await waitFor(() => {
      expect(mockOnConnect).toHaveBeenCalledWith(mockPublicKey);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows alert when Freighter not found', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<WalletConnectionModal {...defaultProps} />);
    
    const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
    await user.click(connectButton);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Freighter wallet not found. Please install it.');
    });
    
    alertSpy.mockRestore();
  });

  it('shows alert on connection failure', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockFreighter.getPublicKey.mockRejectedValue(new Error('Connection failed'));
    (window as any).freighter = mockFreighter;
    
    render(<WalletConnectionModal {...defaultProps} />);
    
    const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
    await user.click(connectButton);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to connect wallet');
      expect(consoleSpy).toHaveBeenCalledWith('Wallet connection failed:', expect.any(Error));
    });
    
    alertSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('closes modal when X button clicked', async () => {
    const user = userEvent.setup();
    render(<WalletConnectionModal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: '' }); // X button has no accessible name
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows connecting state during connection', async () => {
    const user = userEvent.setup();
    let resolveConnection: (value: string) => void;
    const connectionPromise = new Promise<string>((resolve) => {
      resolveConnection = resolve;
    });
    
    mockFreighter.getPublicKey.mockReturnValue(connectionPromise);
    (window as any).freighter = mockFreighter;
    
    render(<WalletConnectionModal {...defaultProps} />);
    
    const connectButton = screen.getByRole('button', { name: /connect freighter wallet/i });
    await user.click(connectButton);
    
    expect(screen.getByRole('button', { name: /connecting/i })).toBeDisabled();
    
    resolveConnection!('GTEST123');
    await waitFor(() => {
      expect(mockOnConnect).toHaveBeenCalledWith('GTEST123');
    });
  });
});
