'use client';

import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { X } from 'lucide-react';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
}

export default function CalendarModal({
  isOpen,
  onClose,
  propertyId,
}: CalendarModalProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Manage Availability</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <Calendar size={18} />
            <p className="text-sm">Select dates to mark as unavailable</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center text-gray-500 text-sm">
            Calendar widget would be integrated here
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
