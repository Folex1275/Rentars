'use client';

import { useState } from 'react';
import { Heart, Share2, CheckCircle } from 'lucide-react';
import PropertyImageGallery from './PropertyImageGallery';
import PropertyMap from './PropertyMap';
import PropertyCalendar from './PropertyCalendar';
import PropertyReviewsSection from './PropertyReviewsSection';
import type { Property } from '@/types/property';

interface PropertyDetailProps {
  property: Property & {
    amenities?: string[];
    description_full?: string;
    host_name?: string;
    host_image?: string;
    reviews?: Array<{ id: string; author: string; rating: number; comment: string; date: string }>;
    average_rating?: number;
    blocked_dates?: string[];
    latitude?: number;
    longitude?: number;
  };
}

export default function PropertyDetail({ property }: PropertyDetailProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);

  const amenities = property.amenities || [
    'WiFi',
    'Kitchen',
    'Parking',
    'Air Conditioning',
    'Heating',
    'Washer',
  ];

  const handleShare = (platform: string) => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `Check out this property: ${property.title}`;

    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      copy: url,
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } else {
      window.open(shareUrls[platform], '_blank');
    }
    setShowShareMenu(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header with title and actions */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">{property.title}</h1>
          <p className="text-gray-600 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" />
            {property.location}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className={`p-2 rounded-full border transition ${
              isFavorite ? 'bg-red-50 border-red-300' : 'border-gray-300'
            }`}
          >
            <Heart size={24} className={isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="p-2 rounded-full border border-gray-300 hover:bg-gray-50"
            >
              <Share2 size={24} className="text-gray-600" />
            </button>
            {showShareMenu && (
              <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-10">
                <button
                  onClick={() => handleShare('twitter')}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                >
                  Share on Twitter
                </button>
                <button
                  onClick={() => handleShare('facebook')}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                >
                  Share on Facebook
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                >
                  Copy Link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main content */}
        <div className="col-span-2 space-y-8">
          {/* Image Gallery */}
          <PropertyImageGallery images={property.images} title={property.title} />

          {/* Description */}
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-2xl font-bold mb-4">About this property</h2>
            <p className="text-gray-700 leading-relaxed">
              {expandedDescription ? property.description_full || property.description : property.description}
            </p>
            {property.description_full && property.description_full.length > 200 && (
              <button
                onClick={() => setExpandedDescription(!expandedDescription)}
                className="text-blue-600 hover:underline mt-2"
              >
                {expandedDescription ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {/* Amenities */}
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-2xl font-bold mb-4">Amenities</h2>
            <div className="grid grid-cols-2 gap-4">
              {amenities.map((amenity) => (
                <div key={amenity} className="flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-600" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Location</h2>
            <PropertyMap
              location={property.location}
              latitude={property.latitude}
              longitude={property.longitude}
            />
          </div>

          {/* Calendar */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Availability</h2>
            <PropertyCalendar blockedDates={property.blocked_dates} />
          </div>

          {/* Reviews */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Reviews</h2>
            <PropertyReviewsSection
              reviews={property.reviews}
              averageRating={property.average_rating}
            />
          </div>

          {/* Host Info */}
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-2xl font-bold mb-4">Meet your host</h2>
            <div className="flex items-center gap-4">
              {property.host_image && (
                <img
                  src={property.host_image}
                  alt={property.host_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
              <div>
                <p className="font-semibold text-lg">{property.host_name || 'Host'}</p>
                <p className="text-gray-600">Verified host</p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Sidebar */}
        <div className="col-span-1">
          <div className="bg-white p-6 rounded-lg border sticky top-8">
            <div className="mb-6">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold">${property.price_per_night}</span>
                <span className="text-gray-600">per night</span>
              </div>
            </div>

            <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 mb-4">
              Book Now
            </button>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cleaning fee</span>
                <span>$50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service fee</span>
                <span>$25</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span>${property.price_per_night + 75}</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-900">
              <p className="font-semibold mb-2">✓ Blockchain Verified</p>
              <p>This property is registered on the Stellar blockchain for transparency and security.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
