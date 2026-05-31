'use client';

import { CreditCard, Plus } from 'lucide-react';

interface PaymentMethodsProps {
  onAddMethod?: () => void;
}

export default function PaymentMethods({ onAddMethod }: PaymentMethodsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
        <button
          onClick={onAddMethod}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          <Plus size={16} />
          Add Method
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <CreditCard size={20} className="text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">Bank Account</p>
              <p className="text-sm text-gray-500">****1234</p>
            </div>
          </div>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
            Primary
          </span>
        </div>
      </div>
    </div>
  );
}
