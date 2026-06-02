import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/tests/utils/test-utils';
import SearchBar from '../SearchBar';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('SearchBar', () => {
  let mockOnSearch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSearch = vi.fn();
  });

  it('renders search input', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    expect(screen.getByPlaceholderText(/Search by location/i)).toBeInTheDocument();
  });

  it('typing triggers autocomplete suggestions', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByPlaceholderText(/Search by location/i);

    fireEvent.change(input, { target: { value: 'New York' } });

    await waitFor(() => {
      expect(screen.getByText(/New York, USA/)).toBeInTheDocument();
      expect(screen.getByText(/New York, Canada/)).toBeInTheDocument();
      expect(screen.getByText(/New York, UK/)).toBeInTheDocument();
    });
  });

  it('selecting suggestion updates input', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByPlaceholderText(/Search by location/i);

    fireEvent.change(input, { target: { value: 'Paris' } });

    await waitFor(() => {
      expect(screen.getByText(/Paris, USA/)).toBeInTheDocument();
    });

    const suggestion = screen.getByText(/Paris, USA/);
    fireEvent.click(suggestion);

    expect(input).toHaveValue('Paris, USA');
  });

  it('selecting suggestion calls onSearch', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByPlaceholderText(/Search by location/i);

    fireEvent.change(input, { target: { value: 'London' } });

    await waitFor(() => {
      expect(screen.getByText(/London, USA/)).toBeInTheDocument();
    });

    const suggestion = screen.getByText(/London, USA/);
    fireEvent.click(suggestion);

    expect(mockOnSearch).toHaveBeenCalledWith('London, USA');
  });

  it('suggestions disappear after selection', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByPlaceholderText(/Search by location/i);

    fireEvent.change(input, { target: { value: 'Tokyo' } });

    await waitFor(() => {
      expect(screen.getByText(/Tokyo, USA/)).toBeInTheDocument();
    });

    const suggestion = screen.getByText(/Tokyo, USA/);
    fireEvent.click(suggestion);

    await waitFor(() => {
      expect(screen.queryByText(/Tokyo, Canada/)).not.toBeInTheDocument();
    });
  });

  it('pressing Enter calls onSearch with current input', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByPlaceholderText(/Search by location/i);

    fireEvent.change(input, { target: { value: 'Berlin' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(mockOnSearch).toHaveBeenCalledWith('Berlin');
  });

  it('empty input does not show suggestions', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByPlaceholderText(/Search by location/i);

    fireEvent.change(input, { target: { value: '' } });

    expect(screen.queryByText(/USA/)).not.toBeInTheDocument();
  });

  it('clears suggestions when input is cleared', async () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    const input = screen.getByPlaceholderText(/Search by location/i);

    fireEvent.change(input, { target: { value: 'Rome' } });

    await waitFor(() => {
      expect(screen.getByText(/Rome, USA/)).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.queryByText(/Rome, USA/)).not.toBeInTheDocument();
    });
  });
});
