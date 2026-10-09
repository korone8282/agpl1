import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setDate, setMonth, setDays, setSection } from '../redux/Slices/dateSlice';
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { Button } from "./Buttons";
import { ChevronDown, Layers, Calendar, CalendarDays } from "lucide-react";

const DataLog = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [isOpen, setIsOpen] = useState(false);
  const [isOpen2, setIsOpen2] = useState(false);
  const [isOpen3, setIsOpen3] = useState(false);

  const data = useSelector((state) => state.data);

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

  const currentMonthData = months[(data.month || 1) - 1] || months[0];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Section Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-primary/40 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-2"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Section: {data.section || "Select"}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-44 p-2 bg-[#111111] border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl"
          onClick={() => setIsOpen(false)}
        >
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className="justify-start text-xs text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg py-2"
              onClick={() => {
                dispatch(setSection("Kitchen"));
                navigate(`/admin/Kitchen/${data.month}`);
              }}
            >
              Kitchen
            </Button>
            <Button
              variant="ghost"
              className="justify-start text-xs text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg py-2"
              onClick={() => {
                dispatch(setSection("Filling"));
                navigate(`/admin/Filling/${data.month}`);
              }}
            >
              Filling
            </Button>
            <Button
              variant="ghost"
              className="justify-start text-xs text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg py-2"
              onClick={() => {
                dispatch(setSection("Dispatch"));
                navigate(`/admin/Dispatch/${data.month}`);
              }}
            >
              Dispatch
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Date Popover */}
      <Popover open={isOpen2} onOpenChange={setIsOpen2}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-primary/40 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-2"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Date: {data.date || "Day"}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[280px] p-3 bg-[#111111] border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl"
          onClick={() => setIsOpen2(false)}
        >
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: currentMonthData.days }, (_, i) => i + 1).map((day) => (
              <Button
                key={day}
                variant="ghost"
                className={`w-8 h-8 p-0 text-xs font-mono rounded-lg transition-colors ${
                  data.date === day
                    ? "bg-primary text-black font-bold"
                    : "text-zinc-300 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => {
                  dispatch(setDate(day));
                  navigate(`/admin/${data.section}/${data.month}`);
                }}
              >
                {day}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Month Popover */}
      <Popover open={isOpen3} onOpenChange={setIsOpen3}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-primary/40 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-2"
          >
            <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
            <span>Month: {currentMonthData.month}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-3 bg-[#111111] border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl"
          onClick={() => setIsOpen3(false)}
        >
          <div className="grid grid-cols-3 gap-2">
            {months.map((m, index) => (
              <Button
                key={m.month}
                variant="ghost"
                className={`text-xs py-2 rounded-lg font-medium transition-all ${
                  data.month === index + 1
                    ? "bg-primary text-black font-bold"
                    : "text-zinc-300 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => {
                  dispatch(setMonth(index + 1));
                  dispatch(setDays(m.days));
                  navigate(`/admin/${data.section}/${m.month}`);
                }}
              >
                {m.month.slice(0, 3)}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DataLog;
