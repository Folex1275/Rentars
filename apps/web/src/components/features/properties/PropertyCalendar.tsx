'use client';

interface PropertyCalendarProps {
  blockedDates?: string[];
}

export default function PropertyCalendar({ blockedDates = [] }: PropertyCalendarProps) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="font-semibold mb-4">{monthName}</h3>
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-500">
            {day}
          </div>
        ))}
        {days.map((day, idx) => (
          <div
            key={idx}
            className={`text-center py-2 text-sm rounded ${
              day === null
                ? ''
                : blockedDates.includes(`${currentYear}-${currentMonth + 1}-${day}`)
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}
