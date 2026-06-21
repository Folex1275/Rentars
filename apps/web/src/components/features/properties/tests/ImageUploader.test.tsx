import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/tests/utils/test-utils';
import userEvent from '@testing-library/user-event';
import ImageUploader from '../ImageUploader';

// Browser APIs not available in jsdom
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:http://localhost/test-object-url'),
  revokeObjectURL: vi.fn(),
});

// IntersectionObserver stub
vi.stubGlobal(
  'IntersectionObserver',
  vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() })),
);

// HTMLCanvasElement.toBlob stub — returns a small valid blob
HTMLCanvasElement.prototype.toBlob = function (callback, _type, _quality) {
  callback(new Blob(['fake-image-data'], { type: 'image/webp' }));
};
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as any;

// Image constructor stub — fires onload immediately
vi.stubGlobal(
  'Image',
  class {
    width = 800;
    height = 600;
    set src(_: string) {
      (this as any).onload?.();
    }
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
  },
);

function makeFile(name = 'photo.jpg', type = 'image/jpeg', sizeBytes = 1024) {
  return new File([new ArrayBuffer(sizeBytes)], name, { type });
}

describe('ImageUploader (local mode)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the drop zone', () => {
    render(<ImageUploader />);
    expect(screen.getByLabelText('Upload images by clicking or dragging files here')).toBeInTheDocument();
  });

  it('shows image count in drop zone hint', () => {
    render(<ImageUploader maxImages={10} />);
    expect(screen.getByText(/0\/10/)).toBeInTheDocument();
  });

  it('accepts dropped image files and shows previews', async () => {
    const onChange = vi.fn();
    render(<ImageUploader onChange={onChange} />);

    const dropzone = screen.getByLabelText('Upload images by clicking or dragging files here');
    const file = makeFile('test.jpg', 'image/jpeg');

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Uploaded images' })).toBeInTheDocument();
    });
  });

  it('rejects files with unsupported MIME types and shows error', async () => {
    render(<ImageUploader />);

    const dropzone = screen.getByLabelText('Upload images by clicking or dragging files here');
    const file = makeFile('doc.pdf', 'application/pdf');

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText(/Only JPEG, PNG, and WebP/)).toBeInTheDocument();
    });
  });

  it('rejects files that exceed the 5 MB limit', async () => {
    render(<ImageUploader />);

    const dropzone = screen.getByLabelText('Upload images by clicking or dragging files here');
    const bigFile = makeFile('huge.jpg', 'image/jpeg', 6 * 1024 * 1024);

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [bigFile] },
    });

    await waitFor(() => {
      expect(screen.getByText(/5 MB limit/)).toBeInTheDocument();
    });
  });

  it('marks first local image as primary', async () => {
    const onChange = vi.fn();
    render(<ImageUploader onChange={onChange} />);

    const dropzone = screen.getByLabelText('Upload images by clicking or dragging files here');
    fireEvent.drop(dropzone, { dataTransfer: { files: [makeFile()] } });

    await waitFor(() => {
      expect(screen.getByText('Primary')).toBeInTheDocument();
    });
  });

  it('calls onChange with current images after adding', async () => {
    const onChange = vi.fn();
    render(<ImageUploader onChange={onChange} />);

    const dropzone = screen.getByLabelText('Upload images by clicking or dragging files here');
    fireEvent.drop(dropzone, { dataTransfer: { files: [makeFile()] } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      const [images] = onChange.mock.lastCall!;
      expect(images).toHaveLength(1);
    });
  });

  it('respects maxImages limit', async () => {
    const onChange = vi.fn();
    render(<ImageUploader maxImages={1} onChange={onChange} />);

    const dropzone = screen.getByLabelText('Upload images by clicking or dragging files here');
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [makeFile('a.jpg'), makeFile('b.jpg')] },
    });

    await waitFor(() => {
      const [images] = onChange.mock.lastCall!;
      expect(images).toHaveLength(1);
    });
  });

  it('removes an image when delete button is clicked', async () => {
    const onChange = vi.fn();
    render(<ImageUploader onChange={onChange} />);

    const dropzone = screen.getByLabelText('Upload images by clicking or dragging files here');
    fireEvent.drop(dropzone, { dataTransfer: { files: [makeFile()] } });

    await waitFor(() => screen.getByRole('list', { name: 'Uploaded images' }));

    const removeBtn = screen.getByLabelText('Remove image 1');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('list', { name: 'Uploaded images' })).not.toBeInTheDocument();
    });
  });

  it('promotes next image to primary when primary is removed', async () => {
    render(<ImageUploader />);

    const dropzone = screen.getByLabelText('Upload images by clicking or dragging files here');
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [makeFile('a.jpg'), makeFile('b.jpg')] },
    });

    await waitFor(() => screen.getAllByRole('listitem'));

    // Remove the primary (index 0)
    const removeBtn = screen.getByLabelText('Remove image 1');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.getByText('Primary')).toBeInTheDocument();
    });
  });

  it('sets a non-primary image as primary when star button is clicked', async () => {
    render(<ImageUploader />);

    const dropzone = screen.getByLabelText('Upload images by clicking or dragging files here');
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [makeFile('a.jpg'), makeFile('b.jpg')] },
    });

    await waitFor(() => screen.getAllByRole('listitem'));

    // Hover to reveal actions then click "Set as primary" on image 2
    const setPrimaryBtn = screen.getByLabelText('Set as primary image');
    fireEvent.click(setPrimaryBtn);

    await waitFor(() => {
      const badges = screen.getAllByText('Primary');
      expect(badges).toHaveLength(1);
    });
  });

  it('does not show non-primary images without the primary badge', async () => {
    render(<ImageUploader />);

    const dropzone = screen.getByLabelText('Upload images by clicking or dragging files here');
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [makeFile('a.jpg'), makeFile('b.jpg')] },
    });

    await waitFor(() => screen.getAllByRole('listitem'));

    const badges = screen.queryAllByText('Primary');
    expect(badges).toHaveLength(1);
  });

  it('disables drop zone when at capacity', async () => {
    render(<ImageUploader maxImages={1} />);

    const dropzone = screen.getByLabelText('Upload images by clicking or dragging files here');
    fireEvent.drop(dropzone, { dataTransfer: { files: [makeFile()] } });

    await waitFor(() => screen.getByRole('list'));

    expect(screen.getByLabelText('Upload images by clicking or dragging files here')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
