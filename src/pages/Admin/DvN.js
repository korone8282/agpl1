import React, { useState } from 'react';
import Loader from '../../components/Loader';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { DATA_URL } from '../../redux/Utils/constants';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import { Input } from "../../components/Input";
import { Sun, Moon, GitCompare } from "lucide-react";
import PageTransition from '../PageTransition';

const DvN = () => {
  const [loading, setLoading] = useState(0);
  const [error, setError] = useState(0);
  const [data, setData] = useState();

  const [info, setInfo] = useState({
    start: "",
    end: "",
  });

  const { userinfo } = useSelector((state) => state.auth);

  const inputHandler = async (e) => {
    setInfo((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }));
  };

  async function getData() {
    try {
      setError(0);
      setLoading(1);

      const res = await apiConnector(`${DATA_URL}/DvN`, "PUT", info, {
        Authorization: `Bearer ${userinfo.token}`,
      });

      setData(res.data.data);
      setLoading(0);
    } catch (e) {
      setError(1);
      console.log(e);
      setLoading(0);
    }
  }

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full space-y-6 text-start">
          {/* Header Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  Analytics & Comparison
                </span>
                <span className="text-zinc-500 text-xs font-mono">• Shift Benchmark</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <GitCompare className="w-7 h-7 text-primary" />
                Day Shift vs Night Shift Performance
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Benchmark batch production yield, pouches packed, losses, and worker allocation between shifts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl">
                <span className="text-xs text-zinc-400 font-mono uppercase">From:</span>
                <Input
                  type="date"
                  name="start"
                  onChange={(e) => inputHandler(e)}
                  className="bg-transparent border-0 text-white text-xs font-mono focus:outline-none cursor-pointer h-7 p-0"
                />
              </div>

              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl">
                <span className="text-xs text-zinc-400 font-mono uppercase">To:</span>
                <Input
                  type="date"
                  name="end"
                  onChange={(e) => inputHandler(e)}
                  className="bg-transparent border-0 text-white text-xs font-mono focus:outline-none cursor-pointer h-7 p-0"
                />
              </div>

              <button
                type="button"
                onClick={getData}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-primary/20 transition-all cursor-pointer"
              >
                Compare Shifts
              </button>
            </div>
          </div>

          {error ? (
            <div className="py-24 text-center">
              <p className="text-2xl font-bold text-zinc-400">No Data Entry Found</p>
              <p className="text-xs text-zinc-600 mt-2">No shift log entries found for the selected date range.</p>
            </div>
          ) : (
            <div>
              {loading ? (
                <Loader />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 overflow-hidden shadow-2xl backdrop-blur-xl">
                  <div className="overflow-x-auto max-h-[44rem]">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-[#141414] border-b border-white/10 shadow-lg">
                        <TableRow className="bg-[#141414] hover:bg-[#141414] border-b border-white/10">
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Shift Window</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Batches</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Yield (Kg)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Filled</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Packed</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Empty Loss</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Filled Loss (Kg)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Carton Boxes</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Worker Count</TableHead>
                        </TableRow>
                      </TableHeader>

                      {data ? (
                        <TableBody>
                          {/* Day Shift Row */}
                          <TableRow className="hover:bg-amber-500/[0.04] border-b border-white/5 transition-colors">
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2 font-bold text-amber-400 text-xs">
                                <Sun className="w-4 h-4 text-amber-400" />
                                <span>Day Shift</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-white py-4">
                              {data
                                .filter((item) => item.dayTime === "Day")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.batchQuantity, 0), 0)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-zinc-200 py-4">
                              {data
                                .filter((item) => item.dayTime === "Day")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.yield * obj.batchQuantity, 0), 0)
                                .toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-emerald-400 font-bold py-4">
                              {data
                                .filter((item) => item.dayTime === "Day")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.pouchQuantity, 0), 0)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-cyan-400 font-bold py-4">
                              {data
                                .filter((item) => item.dayTime === "Day")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.pouchPacked, 0), 0)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-amber-400 py-4">
                              {data
                                .filter((item) => item.dayTime === "Day")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.empty, 0), 0)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-rose-400 py-4">
                              {data
                                .filter((item) => item.dayTime === "Day")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.filled, 0), 0)
                                .toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-zinc-200 py-4">
                              {data
                                .filter((item) => item.dayTime === "Day")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.box, 0), 0)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-primary font-semibold py-4">
                              {data
                                .filter((item) => item.dayTime === "Day" && item.sectionMain !== "Dispatch")
                                .reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList.reduce(
                                      (accumulator, obj, index) => accumulator + (index === 0 ? obj.workersQuantity : 0),
                                      0
                                    ),
                                  0
                                )}
                            </TableCell>
                          </TableRow>

                          {/* Night Shift Row */}
                          <TableRow className="hover:bg-indigo-500/[0.04] border-b border-white/5 transition-colors">
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2 font-bold text-indigo-400 text-xs">
                                <Moon className="w-4 h-4 text-indigo-400" />
                                <span>Night Shift</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-white py-4">
                              {data
                                .filter((item) => item.dayTime === "Night")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.batchQuantity, 0), 0)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-zinc-200 py-4">
                              {data
                                .filter((item) => item.dayTime === "Night")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.yield * obj.batchQuantity, 0), 0)
                                .toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-emerald-400 font-bold py-4">
                              {data
                                .filter((item) => item.dayTime === "Night")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.pouchQuantity, 0), 0)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-cyan-400 font-bold py-4">
                              {data
                                .filter((item) => item.dayTime === "Night")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.pouchPacked, 0), 0)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-amber-400 py-4">
                              {data
                                .filter((item) => item.dayTime === "Night")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.empty, 0), 0)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-rose-400 py-4">
                              {data
                                .filter((item) => item.dayTime === "Night")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.filled, 0), 0)
                                .toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-zinc-200 py-4">
                              {data
                                .filter((item) => item.dayTime === "Night")
                                .reduce((acc, obj) => acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.box, 0), 0)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-primary font-semibold py-4">
                              {data
                                .filter((item) => item.dayTime === "Night" && item.sectionMain !== "Dispatch")
                                .reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList.reduce(
                                      (accumulator, obj, index) => accumulator + (index === 0 ? obj.workersQuantity : 0),
                                      0
                                    ),
                                  0
                                )}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      ) : (
                        <TableBody>
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-12 text-zinc-500 font-mono text-xs">
                              Select a date range and click "Compare Shifts" to view comparison analytics
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      )}
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default DvN;
