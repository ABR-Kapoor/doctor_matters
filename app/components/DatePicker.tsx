'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';
import { TranslatedText } from '@/app/components/TranslatedText';
import { formatDate } from '@/lib/shared/utils';
import { useTranslation } from '@/app/hooks/useTranslation';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
}

export function DatePicker({ value, onChange, minDate, maxDate, placeholder }: DatePickerProps) {
  const { text: defaultPlaceholder } = useTranslation('Select date');
  const { text: prevMonthLabel } = useTranslation('Previous month');
  const { text: nextMonthLabel } = useTranslation('Next month');
  const { text: closeLabel } = useTranslation('Close');
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'years'>('calendar');
  
  // Helper function to safely create a date
  const safeParseDate = (dateStr: string): Date => {
    if (!dateStr || dateStr.trim() === '') {
      return new Date();
    }
    const date = new Date(dateStr + 'T00:00:00');
    return isNaN(date.getTime()) ? new Date() : date;
  };
  
  const [displayMonth, setDisplayMonth] = useState<Date>(() => {
    return safeParseDate(value);
  });

  const [selectedDate, setSelectedDate] = useState<string>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedDate(value);
    if (value && value.trim() !== '') {
      setDisplayMonth(safeParseDate(value));
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setViewMode('calendar');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1));
  };

  const handleDateClick = (day: number) => {
    const year = displayMonth.getFullYear();
    const month = String(displayMonth.getMonth() + 1).padStart(2, '0');
    const date = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;

    if (minDate && dateStr < minDate) return;
    if (maxDate && dateStr > maxDate) return;

    setSelectedDate(dateStr);
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleYearSelect = (year: number) => {
    setDisplayMonth(new Date(year, displayMonth.getMonth(), 1));
    setViewMode('calendar');
  };

  const daysInMonth = getDaysInMonth(displayMonth);
  const firstDay = getFirstDayOfMonth(displayMonth);
  const days: (number | null)[] = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const monthName = `${String(displayMonth.getMonth() + 1).padStart(2, '0')}/${displayMonth.getFullYear()}`;
  const displayValue = selectedDate
    ? formatDate(safeParseDate(selectedDate))
    : (placeholder ?? defaultPlaceholder);

  // Generate years for the selector (centered around display date)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 120 }, (_, i) => currentYear - i);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white border border-gray-200 text-gray-900 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 group hover:border-blue-400"
      >
        <span className={selectedDate ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {displayValue}
        </span>
        <CalendarIcon className="w-5 h-5 text-blue-600 group-hover:text-blue-700 transition-colors" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-3 z-[100] w-[min(320px,90vw)] bg-white rounded-xl border border-blue-100 shadow-xl p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button 
              type="button"
              onClick={() => setViewMode(viewMode === 'calendar' ? 'years' : 'calendar')}
              className="group flex items-center gap-1.5"
            >
              <h3 className="text-lg font-bold text-blue-600 hover:text-blue-700 transition-colors">
                {viewMode === 'calendar' ? monthName : <TranslatedText>Select Year</TranslatedText>}
              </h3>
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                aria-label={prevMonthLabel}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                aria-label={nextMonthLabel}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors ml-1"
                aria-label={closeLabel}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {viewMode === 'calendar' ? (
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-3">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-xs font-bold text-blue-600 tracking-wide py-2">
                    <TranslatedText>{day}</TranslatedText>
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-y-1 gap-x-1">
                {days.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="w-8 h-8" />;
                  }

                  const year = displayMonth.getFullYear();
                  const month = String(displayMonth.getMonth() + 1).padStart(2, '0');
                  const date = String(day).padStart(2, '0');
                  const dateStr = `${year}-${month}-${date}`;

                  const isSelected = selectedDate === dateStr;
                  const isDisabledFlag = !!((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate));
                  const isToday = new Date().toDateString() === new Date(year, displayMonth.getMonth(), day).toDateString();

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDateClick(day)}
                      disabled={isDisabledFlag}
                      className={`
                        w-9 h-9 text-sm transition-all duration-200 flex items-center justify-center rounded-lg
                        ${isSelected
                          ? 'bg-blue-600 text-white font-bold shadow-sm hover:bg-blue-700'
                          : isDisabledFlag
                          ? 'text-gray-300 cursor-not-allowed'
                          : isToday
                          ? 'text-blue-600 font-bold bg-blue-50 border-2 border-blue-600'
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium'
                        }
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* Year Grid */
            <div className="grid grid-cols-3 gap-2 h-[180px] overflow-y-auto pr-2 custom-scrollbar">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleYearSelect(year)}
                  className={`
                    py-2 rounded-lg text-sm font-medium transition-colors
                    ${displayMonth.getFullYear() === year 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }
                  `}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
