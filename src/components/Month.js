import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setDate, setMonth, setDays } from '../redux/Slices/dateSlice';
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const days = Array.from({ length: 31 }, (_, i) => i + 1);

const months = [
  { month: "January", days: 31 },
  { month: "February", days: 28 },
  { month: "March", days: 31 },
  { month: "April", days: 30 },
  { month: "May", days: 31 },
  { month: "June", days: 30 },
  { month: "July", days: 31 },
  { month: "August", days: 31 },
  { month: "September", days: 30 },
  { month: "October", days: 31 },
  { month: "November", days: 30 },
  { month: "December", days: 31 },
];

const Month = () => {
  const data = useSelector((state) => state.data);
  const val = data.section;
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);

  useEffect(() => {
    dispatch(setMonth(new Date().getMonth() + 1));
  }, [dispatch]);

  return (
    <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full space-y-6 text-start">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                Department Archive
              </span>
              <span className="text-zinc-500 text-xs font-mono">• {val || "Section"} Date Selector</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Calendar className="w-7 h-7 text-primary" />
              Daily Log Explorer: <span className="text-primary">{selectedMonth.month}</span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Select a date to open the shift ledger for {val || "the department"}.
            </p>
          </div>

          {/* Month Selector Carousel */}
          <div className="flex items-center gap-2 bg-[#141414] p-1.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => {
                const currentMonthIndex = months.indexOf(selectedMonth);
                const startIndex = Math.max(0, Math.min(months.length - 3, currentMonthIndex - 1));
                setSelectedMonth(months[startIndex]);
              }}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {months.map((month, index) => {
              const currentMonthIndex = months.indexOf(selectedMonth);
              const startIndex = Math.max(0, Math.min(months.length - 3, currentMonthIndex - 1));
              const visibleMonths = months.slice(startIndex, startIndex + 3);

              if (!visibleMonths.includes(month)) return null;

              return (
                <button
                  type="button"
                  key={month.month}
                  onClick={() => {
                    setSelectedMonth(months[index]);
                    dispatch(setMonth(index + 1));
                    dispatch(setDays(val?.days || month.days));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedMonth.month === month.month
                      ? "bg-primary text-black font-bold shadow-md shadow-primary/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {month.month.slice(0, 3)}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                const currentMonthIndex = months.indexOf(selectedMonth);
                const startIndex = Math.max(0, Math.min(months.length - 3, currentMonthIndex - 1));
                setSelectedMonth(months[startIndex + 2]);
              }}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 p-6 backdrop-blur-xl shadow-2xl">
          <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-11 gap-3 sm:gap-4">
            {days.slice(0, selectedMonth.days).map((day, i) => (
              <motion.button
                key={day}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  dispatch(setDate(i + 1));
                  navigate(`/admin/${val}/${data.month}`);
                }}
                className="aspect-square rounded-xl flex flex-col items-center justify-center border border-white/10 bg-white/[0.02] hover:bg-primary hover:text-black hover:border-primary text-white text-base font-bold transition-all duration-200 cursor-pointer shadow-sm group"
              >
                <span className="text-xs font-mono opacity-40 group-hover:opacity-100">Day</span>
                <span>{day}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Month;