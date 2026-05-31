'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsProps {
  data?: Array<{
    month: string;
    spent: number;
  }>;
}

export default function Analytics({ data }: AnalyticsProps) {
  const defaultData = [
    { month: 'Jan', spent: 400 },
    { month: 'Feb', spent: 300 },
    { month: 'Mar', spent: 600 },
    { month: 'Apr', spent: 800 },
    { month: 'May', spent: 500 },
    { month: 'Jun', spent: 700 },
  ];

  const chartData = data || defaultData;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Analytics</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="spent" fill="#3b82f6" name="USDC Spent" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
