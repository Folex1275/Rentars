'use client';

import { Star } from 'lucide-react';

interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

interface PropertyReviewsSectionProps {
  reviews?: Review[];
  averageRating?: number;
}

export default function PropertyReviewsSection({
  reviews = [],
  averageRating = 0,
}: PropertyReviewsSectionProps) {
  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="flex items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={i < Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500">{reviews.length} reviews</p>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-gray-500">No reviews yet</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border-t pt-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">{review.author}</p>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-500">{review.date}</p>
              </div>
              <p className="text-gray-700">{review.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
