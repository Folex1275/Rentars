'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface PropertyImageGalleryProps {
  images: string[];
  title: string;
}

/**
 * Lazy-loads a single image using IntersectionObserver.
 * Renders a blurred placeholder until the image enters the viewport.
 */
function LazyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={ref}
      src={inView ? src : undefined}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}

export default function PropertyImageGallery({ images, title }: PropertyImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      else if (e.key === 'ArrowRight') goToNext();
      else if (e.key === 'Escape') setIsLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isLightboxOpen, currentIndex]);

  if (!images.length) {
    return (
      <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No images available</p>
      </div>
    );
  }

  return (
    <>
      {/* Main carousel */}
      <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden group">
        <LazyImage
          src={images[currentIndex]}
          alt={`${title} - Image ${currentIndex + 1}`}
          className="w-full h-full object-cover cursor-pointer"
        />
        {/* invisible overlay to capture click for lightbox */}
        <button
          type="button"
          className="absolute inset-0 w-full h-full opacity-0"
          aria-label="Open image lightbox"
          onClick={() => setIsLightboxOpen(true)}
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" role="tablist" aria-label="Image navigation">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={idx === currentIndex}
              aria-label={`Go to image ${idx + 1}`}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition ${
                idx === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* Image counter */}
        <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {currentIndex + 1} / {images.length}
        </span>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1" role="list" aria-label="Image thumbnails">
          {images.map((src, idx) => (
            <button
              key={idx}
              type="button"
              role="listitem"
              onClick={() => setCurrentIndex(idx)}
              className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition ${
                idx === currentIndex ? 'border-blue-500' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              aria-label={`View image ${idx + 1}`}
              aria-current={idx === currentIndex ? 'true' : undefined}
            >
              <LazyImage
                src={src}
                alt={`${title} thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-full transition"
            aria-label="Close lightbox"
          >
            <X size={32} />
          </button>
          <button
            type="button"
            onClick={goToPrevious}
            className="absolute left-4 text-white hover:bg-white/20 p-2 rounded-full transition"
            aria-label="Previous image"
          >
            <ChevronLeft size={32} />
          </button>

          {/* Lightbox image — eagerly loaded since user explicitly opened it */}
          <img
            src={images[currentIndex]}
            alt={`${title} - Image ${currentIndex + 1}`}
            className="max-w-4xl max-h-[90vh] object-contain"
            loading="eager"
          />

          <button
            type="button"
            onClick={goToNext}
            className="absolute right-4 text-white hover:bg-white/20 p-2 rounded-full transition"
            aria-label="Next image"
          >
            <ChevronRight size={32} />
          </button>

          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      )}
    </>
  );
}
