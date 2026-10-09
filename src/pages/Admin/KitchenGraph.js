import React, { useState, useEffect } from 'react';
import Loader from '../../components/Loader';
import Wrapper from '../../components/Wrapper';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { GRAPH_URL } from '../../redux/Utils/constants';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/Popover";
import { Button } from "../../components/Buttons";
import PageTransition from '../PageTransition';

const KitchenGraph = () => {
  const { userinfo } = useSelector((state) => state.auth);

  const [month, setmonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(1);
  const [error, setError] = useState(0);
  const [arr, setArr] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const months = React.useMemo(() => [
    { month: "January" },
    { month: "February" },
    { month: "March" },
    { month: "April" },
    { month: "May" },
    { month: "June" },
    { month: "July" },
    { month: "August" },
    { month: "September" },
    { month: "October" },
    { month: "November" },
    { month: "December" },
  ], []);

  useEffect(() => {
    async function getData() {
      try {
        setLoading(1);
        setError(0);

        const res = await apiConnector(`${GRAPH_URL}/${month}`, "GET", null, {
          Authorization: `Bearer ${userinfo.token}`,
        });

        const next = res.data.data.map((e, i) => {
          const kitchenDocs = e.filter((obj) => obj.sectionMain === 'Kitchen');
          const num = kitchenDocs.reduce(
            (acc, obj) =>
              acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.batchQuantity * obj.yield, 0),
            0
          );
          const workers = kitchenDocs.reduce(
            (acc, obj) =>
              acc +
              obj.dataList.reduce(
                (accumulator, obj, index) => accumulator + (index === 0 ? obj.workersQuantity : 0),
                0
              ),
            0
          );
          const rate = num ? (workers * 900) / num : 0;
          return {
            name: i + 1,
            Production: num,
            // *10000 so line is visible on shared Y-axis; tooltip divides back
            Costing: rate * 10000,
          };
        });
        setArr(next);
        setLoading(0);
      } catch (e) {
        setError(1);
        console.log(e);
      }
    }

    getData();
  }, [userinfo.token, month]);

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full space-y-6 text-start">
          {/* Header Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  Visual Intelligence
                </span>
                <span className="text-zinc-500 text-xs font-mono">• Cooking & Yield Dynamics</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Kitchen Yield Trend: <span className="text-primary">{months[month - 1].month}</span>
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Correlation between daily batch yield (kg) and cooking labor cost per kilogram.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-primary/40 text-primary hover:bg-primary/10 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-2"
                  >
                    <span>Change Month ({months[month - 1].month})</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[300px] p-3 bg-[#111111] border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="grid grid-cols-3 gap-2">
                    {months.map((m, index) => (
                      <Button
                        key={m.month}
                        variant="ghost"
                        className={`text-xs py-2 rounded-lg font-medium transition-all ${
                          month === index + 1
                            ? "bg-primary text-black font-bold"
                            : "text-zinc-300 hover:bg-white/10 hover:text-white"
                        }`}
                        onClick={() => {
                          setmonth(index + 1);
                          setArr([]);
                        }}
                      >
                        {m.month.slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {error ? (
            <div className="py-24 text-center">
              <p className="text-2xl font-bold text-zinc-400">No Data Entry Found</p>
              <p className="text-xs text-zinc-600 mt-2">No kitchen shift log entries recorded for {months[month - 1].month}.</p>
            </div>
          ) : (
            <div>
              {loading ? (
                <Loader />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 p-4 sm:p-6 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                    <div className="flex items-center gap-6 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#8884d8]"></span>
                        <span className="text-zinc-300">Kitchen Yield (Kg)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#82ca9d]"></span>
                        <span className="text-zinc-300">Costing Index (₹/Kg)</span>
                      </div>
                    </div>
                    <span className="text-zinc-500 text-xs font-mono hidden sm:inline">Days 1 - 31</span>
                  </div>
                  <Wrapper data={arr} dataKey={["Production", "Costing"]} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default KitchenGraph;
