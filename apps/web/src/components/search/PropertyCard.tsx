import type { Property } from '@/types/property';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const { isInWishlist, toggle } = useWishlist();
  const saved = isInWishlist(property.id);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow relative">
      <div className="h-48 bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
        {property.images?.[0] ? (
          <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
        ) : (
          'No image'
        )}
      </div>

      {/* Wishlist toggle */}
      <button
        onClick={(e) => { e.preventDefault(); toggle(property.id); }}
        className="absolute top-3 right-3 p-1.5 bg-white rounded-full shadow hover:scale-110 transition-transform"
        aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart size={18} className={saved ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
      </button>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{property.title}</h3>
        <p className="text-sm text-gray-500 mt-1 truncate">{property.location}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-bold text-blue-600">
            {property.price_per_night} USDC
            <span className="text-xs font-normal text-gray-400"> / night</span>
          </span>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              property.available
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {property.available ? 'Available' : 'Booked'}
          </span>
        </div>
      </div>
    </div>
  );
}
