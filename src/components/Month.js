import { useState , useEffect } from "react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setDate,setMonth,setDays} from '../redux/Slices/dateSlice';

const days = Array.from({ length: 31 }, (_, i) => i + 1);

const months = [
  {month:"January",days:31},
  {month:"February",days:28},
  {month:"March",days:31},
  {month:"April",days:30},
  {month:"May",days:31},
  {month:"June",days:30},
  {month:"July",days:31},
  {month:"August",days:31},
  {month:"September",days:30},
  {month:"October",days:31},
  {month:"November",days:30},
  {month:"December",days:31}
 ]


const Month = () => {

  const data = useSelector(state=>state.data);
  
  const val = data.section;
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);

  useEffect(() => {
    dispatch(setMonth(new Date().getMonth()+1));
  }, [dispatch]);

  return (
    <div className="p-6 bg-black backdrop-blur-lg rounded-2xl my-2 max-w-[100rem] mx-auto">
      <div className="mb-6">
        <div className="flex md:flex-row flex-col gap-4 items-center justify-between mb-6">
          <h2 className="text-2xl font-medium text-primary">{selectedMonth.month}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const currentMonthIndex = months.indexOf(selectedMonth);
                const startIndex = Math.max(0, Math.min(months.length - 3, currentMonthIndex - 1));
                setSelectedMonth(months[startIndex]);
              }}
              className="px-4 py-2 rounded-lg text-sm transition-colors bg-secondary/50 text-white hover:bg-secondary"
            >
              &lt;
            </button>
            {months.map((month, index) => {
              const currentMonthIndex = months.indexOf(selectedMonth);
              const startIndex = Math.max(0, Math.min(months.length - 3, currentMonthIndex - 1));
              const visibleMonths = months.slice(startIndex, startIndex + 3);
              
              if (!visibleMonths.includes(month)) return null;

              return (
                <button
                  key={month.month}
                  onClick={()=>{
                    setSelectedMonth(months[index]);
                    dispatch(setMonth(index+1));
                    dispatch(setDays(val.days));  
                  }}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    selectedMonth === month
                      ? "bg-primary text-black" 
                      : "bg-secondary/50 text-white hover:bg-secondary"
                  }`}
                >
                  {month.month}
                </button>
              );
            })}
            <button
              onClick={() => {
                const currentMonthIndex = months.indexOf(selectedMonth);
                const startIndex = Math.max(0, Math.min(months.length - 3, currentMonthIndex - 1));
                setSelectedMonth(months[startIndex + 2]);
              }}
              className="px-4 py-2 rounded-lg text-sm transition-colors bg-secondary/50 text-white hover:bg-secondary"
            >
              &gt;
            </button>
          </div>
        </div>
        <div className="grid grid-cols-11 gap-8 md:gap-4">
          {days.slice(0, selectedMonth.days).map((day,i) => (
            <motion.button
              key={day}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={()=>{
                dispatch(setDate(i+1));
                navigate(`/admin/${val}/${data.month}`);
                }} 
              className={`aspect-square rounded-xl flex items-center justify-center text-md font-medium hover:text-black transition-colors ${
                selectedMonth === months.month
                  ? "bg-primary text-black"
                  : "bg-secondary/50 text-white hover:bg-primary"
              }`}
            >
              {day}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Month