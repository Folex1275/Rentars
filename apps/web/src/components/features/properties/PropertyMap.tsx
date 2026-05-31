'use client';

interface PropertyMapProps {
  location: string;
  latitude?: number;
  longitude?: number;
}

export default function PropertyMap({ location, latitude, longitude }: PropertyMapProps) {
  const mapUrl = latitude && longitude
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`
    : `https://www.openstreetmap.org/export/embed.html?layer=mapnik`;

  return (
    <div className="w-full h-96 bg-gray-200 rounded-lg overflow-hidden">
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        src={mapUrl}
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <p className="text-xs text-gray-500 p-2">Location: {location}</p>
    </div>
  );
}
