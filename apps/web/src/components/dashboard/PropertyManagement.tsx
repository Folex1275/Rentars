'use client';

import { Edit2, Trash2, Plus } from 'lucide-react';
import { useState } from 'react';

interface Property {
  id: string;
  title: string;
  location: string;
  pricePerNight: number;
}

interface PropertyManagementProps {
  properties?: Property[];
  onAdd?: () => void;
  onEdit?: (property: Property) => void;
  onDelete?: (id: string) => void;
}

export default function PropertyManagement({
  properties = [],
  onAdd,
  onEdit,
  onDelete,
}: PropertyManagementProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Property Management</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
        >
          <Plus size={18} />
          Add Property
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No properties yet. Add your first property to get started!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Title
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Location
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Price/Night
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id} className="border-b hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-gray-900">{property.title}</td>
                  <td className="py-3 px-4 text-gray-600">{property.location}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">
                    {property.pricePerNight} USDC
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit?.(property)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 size={18} className="text-gray-600" />
                      </button>
                      {deleteConfirm === property.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              onDelete?.(property.id);
                              setDeleteConfirm(null);
                            }}
                            className="text-xs bg-red-600 text-white px-2 py-1 rounded"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(property.id)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
