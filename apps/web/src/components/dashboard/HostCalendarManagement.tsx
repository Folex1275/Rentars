'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface SeasonalPricing {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price_multiplier: number;
}

interface SpecialEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price_multiplier?: number;
  is_blocked: boolean;
}

interface HostCalendarProps {
  propertyId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function HostCalendarManagement({ propertyId }: HostCalendarProps) {
  const [seasonalPricing, setSeasonalPricing] = useState<SeasonalPricing[]>([]);
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pricingRes, eventRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/calendar/${propertyId}/seasons`),
        fetch(`${API_URL}/api/v1/calendar/${propertyId}/availability`),
      ]);

      if (pricingRes.ok) {
        setSeasonalPricing(await pricingRes.json());
      }
      if (eventRes.ok) {
        const data = await eventRes.json();
        setSpecialEvents(data.filter((d: SpecialEvent | { id: string; is_available: boolean }) => 'is_blocked' in d));
      }
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSeasonalPricing = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`${API_URL}/api/v1/calendar/${propertyId}/seasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          start_date: formData.get('start_date'),
          end_date: formData.get('end_date'),
          price_multiplier: parseFloat(formData.get('price_multiplier') as string),
        }),
      });

      if (res.ok) {
        await fetchData();
        setShowPricingForm(false);
      }
    } catch (err) {
      console.error('Failed to add seasonal pricing:', err);
    }
  };

  const handleAddSpecialEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`${API_URL}/api/v1/calendar/${propertyId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          start_date: formData.get('start_date'),
          end_date: formData.get('end_date'),
          price_multiplier: formData.get('price_multiplier') ? parseFloat(formData.get('price_multiplier') as string) : undefined,
          is_blocked: formData.get('is_blocked') === 'on',
        }),
      });

      if (res.ok) {
        await fetchData();
        setShowEventForm(false);
      }
    } catch (err) {
      console.error('Failed to add special event:', err);
    }
  };

  const handleDeleteSeasonalPricing = async (pricingId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/calendar/${propertyId}/seasons/${pricingId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to delete seasonal pricing:', err);
    }
  };

  const handleDeleteSpecialEvent = async (eventId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/calendar/${propertyId}/events/${eventId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to delete special event:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading calendar management...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Seasonal Pricing */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Seasonal Pricing</h3>
          <button
            onClick={() => setShowPricingForm(!showPricingForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} /> Add Season
          </button>
        </div>

        {showPricingForm && (
          <form onSubmit={handleAddSeasonalPricing} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <input
              type="text"
              name="name"
              placeholder="e.g., Summer High Season"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                name="start_date"
                required
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="date"
                name="end_date"
                required
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <input
              type="number"
              name="price_multiplier"
              placeholder="Multiplier (e.g., 1.5)"
              step="0.1"
              min="0.1"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Save Season
            </button>
          </form>
        )}

        <div className="space-y-2">
          {seasonalPricing.length === 0 ? (
            <p className="text-gray-500 text-sm">No seasonal pricing configured</p>
          ) : (
            seasonalPricing.map((season) => (
              <div key={season.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{season.name}</p>
                  <p className="text-xs text-gray-600">
                    {season.start_date} to {season.end_date} • {season.price_multiplier}x
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteSeasonalPricing(season.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Special Events */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Special Events</h3>
          <button
            onClick={() => setShowEventForm(!showEventForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} /> Add Event
          </button>
        </div>

        {showEventForm && (
          <form onSubmit={handleAddSpecialEvent} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <input
              type="text"
              name="name"
              placeholder="e.g., Holiday Festival"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                name="start_date"
                required
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="date"
                name="end_date"
                required
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="is_blocked" className="rounded" />
                <span>Block dates (unavailable)</span>
              </label>
            </div>
            <input
              type="number"
              name="price_multiplier"
              placeholder="Price multiplier (optional)"
              step="0.1"
              min="0.1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Save Event
            </button>
          </form>
        )}

        <div className="space-y-2">
          {specialEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">No special events configured</p>
          ) : (
            specialEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2 flex-1">
                  {event.is_blocked && <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="font-medium text-sm">{event.name}</p>
                    <p className="text-xs text-gray-600">
                      {event.start_date} to {event.end_date}
                      {event.price_multiplier && ` • ${event.price_multiplier}x`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSpecialEvent(event.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
