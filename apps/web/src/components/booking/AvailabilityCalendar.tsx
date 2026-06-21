'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, AlertCircle } from 'lucide-react';

interface CalendarDay {
  date: string;
  available: boolean;
  reason?: string;
  minimum_stay_met?: boolean;
}

interface CalendarProps {
  propertyId: string;
  onSelectRange?: (checkIn: string, checkOut: string) => void;
  onDateClick?: (date: string) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function AvailabilityCalendar({
  propertyId,
  onSelectRange,
  onDateClick,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<{ start?: string; end?: string }>({});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    const fetchCalendar = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/v1/calendar/${propertyId}/month?year=${year}&month=${month}`,
        );
        if (res.ok) {
          const data = await res.json();
          setDays(data.days || []);
        }
      } catch (err) {
        console.error('Failed to fetch calendar:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendar();
  }, [propertyId, year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (date: string) => {
    onDateClick?.(date);

    if (!selectedRange.start) {
      setSelectedRange({ start: date });
    } else if (!selectedRange.end) {
      if (date > selectedRange.start) {
        setSelectedRange({ ...selectedRange, end: date });
        onSelectRange?.(selectedRange.start, date);
        setSelectedRange({});
      } else {
        setSelectedRange({ start: date });
      }
    } else {
      setSelectedRange({ start: date });
    }
  };

  const isDateInRange = (date: string): boolean => {
    if (!selectedRange.start || !selectedRange.end) return false;
    return date > selectedRange.start && date < selectedRange.end;
  };

  const isStartDate = (date: string): boolean => date === selectedRange.start;
  const isEndDate = (date: string): boolean => date === selectedRange.end;

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-xl font-semibold">
          {monthName} {year}
        </h2>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading calendar...</div>
      ) : (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {daysOfWeek.map((day) => (
              <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const isAvailable = day.available;
              const isSelected = isStartDate(day.date) || isEndDate(day.date);
              const isInRange = isDateInRange(day.date);

              return (
                <button
                  key={day.date}
                  onClick={() => handleDateClick(day.date)}
                  disabled={!isAvailable}
                  title={day.reason}
                  className={`
                    relative p-2 rounded-lg text-sm font-medium transition
                    ${isSelected ? 'bg-blue-600 text-white' : ''}
                    ${isInRange ? 'bg-blue-100' : ''}
                    ${!isAvailable ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-50'}
                  `}
                >
                  {day.date.split('-')[2]}
                  {!isAvailable && <Lock size={12} className="absolute top-1 right-1" />}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 rounded" />
              <span>In range</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center">
                <Lock size={10} />
              </div>
              <span>Unavailable</span>
            </div>
          </div>

          {/* Range info */}
          {selectedRange.start && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">
                  Check-in: {selectedRange.start} {selectedRange.end ? `→ Check-out: ${selectedRange.end}` : '(select checkout)'}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
