import React, { useEffect, useState } from 'react'
import DataLog from '../../components/DataLog'
import { apiConnector } from '../../redux/Utils/apiConnector';
import { DATA_URL } from '../../redux/Utils/constants';
import { useSelector } from 'react-redux';
import Loader from '../../components/Loader'
import { Sun, Moon } from "lucide-react";
import { Button } from "../../components/Buttons";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import PageTransition from '../PageTransition';

const Filiing = () => {

  const [isDayShift, setIsDayShift] = useState(true);

  const date = useSelector(state=>state.data);
  const dayArray = ["Day","Night"];
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(1);
  const [error, setError] = useState(0);

  const {userinfo} = useSelector(state=>state.auth);

  useEffect(() => {
    
    async function getData(){
      try {
        setError(0);
        const res = await apiConnector(`${DATA_URL}/${date.date}/${date.month}`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});
        setData(res.data.data);
        setLoading(0);
      } catch (error) {
        setError(1);
        console.log(error);
      }
    }

  getData();
  }, [date,userinfo.token]);

  const sectionData = data.length ? data.filter( item => item.sectionMain === "Filling" && item.dayTime === `${dayArray[+!isDayShift]}`) : [];

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full space-y-6 text-start">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  Filling Department
                </span>
                <span className="text-zinc-500 text-xs font-mono">• Pouch Packaging & Seal Inspection</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Filling Daily Log: <span className="text-primary">{date.date}-{date.month}-2026</span>
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Production pouches produced, pouch/product wastage loss, and workforce cost per unit.
              </p>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-4">
              <DataLog />

              <Button
                variant="ghost"
                className={`w-11 h-11 p-0 rounded-xl border border-white/10 transition-all duration-300 relative overflow-hidden ${
                  isDayShift ? "bg-amber-400/10 text-amber-400 border-amber-400/30" : "bg-indigo-400/10 text-indigo-400 border-indigo-400/30"
                }`}
                onClick={() => setIsDayShift(!isDayShift)}
                title={isDayShift ? "Day Shift Active" : "Night Shift Active"}
              >
                <div
                  className={`transform transition-all duration-500 ${
                    isDayShift ? "rotate-0 scale-100" : "rotate-180 scale-0"
                  } absolute inset-0 flex items-center justify-center`}
                >
                  <Sun className="w-5 h-5 text-amber-400" />
                </div>
                <div
                  className={`transform transition-all duration-500 ${
                    !isDayShift ? "rotate-0 scale-100" : "rotate-180 scale-0"
                  } absolute inset-0 flex items-center justify-center`}
                >
                  <Moon className="w-5 h-5 text-indigo-400" />
                </div>
              </Button>
            </div>
          </div>

          {error ? (
            <div className="w-full p-16 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
              <p className="text-xl font-bold text-zinc-400">No Data Entry Found</p>
              <p className="text-xs text-zinc-500 mt-1">No filling operations logged for this shift date.</p>
            </div>
          ) : loading ? (
            <Loader />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto max-h-[44rem]">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-[#141414] border-b border-white/10 shadow-lg">
                    <TableRow className="bg-[#141414] hover:bg-[#141414] border-b border-white/10">
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">#</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Container</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Buyer Name</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Product Name</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Batch No.</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pack Size (Kg)</TableHead>
                      <TableHead className="bg-[#141414] text-primary text-xs font-mono py-3.5">Pouches Produced</TableHead>
                      <TableHead className="bg-[#141414] text-amber-400 text-xs font-mono py-3.5">Empty Wastage</TableHead>
                      <TableHead className="bg-[#141414] text-amber-400 text-xs font-mono py-3.5">Filled Wastage (Kg)</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5 text-center">Workers</TableHead>
                      <TableHead className="bg-[#141414] text-primary text-xs font-mono py-3.5 text-center">Cost / Pouch</TableHead>
                    </TableRow>
                  </TableHeader>

                  {sectionData.length ? (
                    <TableBody>
                      {(() => {
                        const list = sectionData[0]?.dataList || [];
                        const workers = Number(list[0]?.workersQuantity) || 0;
                        const totalPouches = list.reduce((acc, obj) => acc + obj.pouchQuantity, 0);
                        const costPerUnit = totalPouches ? (workers * 900) / totalPouches : 0;
                        return list.map((row, i) => (
                          <TableRow key={row.sNo || i} className="hover:bg-white/[0.03] border-b border-white/5 transition-colors">
                            <TableCell className="font-mono text-xs text-zinc-500 py-3.5">{i + 1}</TableCell>
                            <TableCell className="font-mono text-xs text-zinc-400 py-3.5">{row.container}</TableCell>
                            <TableCell className="text-zinc-300 text-xs py-3.5">{row.buyerName}</TableCell>
                            <TableCell className="text-white font-semibold text-xs py-3.5">{row.productName}</TableCell>
                            <TableCell className="font-mono text-xs text-zinc-200 py-3.5">{row.batch}</TableCell>
                            <TableCell className="font-mono text-xs text-zinc-300 py-3.5">{row.packSize}</TableCell>
                            <TableCell className="font-mono text-xs text-primary font-bold py-3.5">{row.pouchQuantity}</TableCell>
                            <TableCell className="font-mono text-xs text-amber-400 py-3.5">{row.empty}</TableCell>
                            <TableCell className="font-mono text-xs text-amber-400 py-3.5">{row.filled}</TableCell>
                            {i === 0 && (
                              <TableCell rowSpan={list.length} className="text-center align-middle font-mono text-xs text-white py-3.5 bg-black/40 border-l border-white/5">
                                {workers}
                              </TableCell>
                            )}
                            {i === 0 && (
                              <TableCell rowSpan={list.length} className="text-center align-middle font-mono text-xs text-primary font-bold py-3.5 bg-black/40 border-l border-white/5">
                                ₹{costPerUnit.toFixed(3)}
                              </TableCell>
                            )}
                          </TableRow>
                        ));
                      })()}
                      <TableRow className="font-mono text-xs font-bold bg-[#141414] border-t-2 border-white/20 text-white">
                        <TableCell colSpan={6} className="text-primary py-4 uppercase">Filling Total:</TableCell>
                        <TableCell className="text-primary py-4">
                          {sectionData[0].dataList.reduce((accumulator, obj) => accumulator + obj.pouchQuantity, 0)} units
                        </TableCell>
                        <TableCell className="text-amber-400 py-4">
                          {sectionData[0].dataList.reduce((accumulator, obj) => accumulator + obj.empty, 0)} empty
                        </TableCell>
                        <TableCell className="text-amber-400 py-4">
                          {sectionData[0].dataList.reduce((accumulator, obj) => accumulator + obj.filled, 0).toFixed(2)} Kg
                        </TableCell>
                        <TableCell colSpan={2} className="py-4"></TableCell>
                      </TableRow>
                    </TableBody>
                  ) : (
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-16 text-zinc-400 text-sm">
                          No filling operations logged for this shift.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  )}
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Filiing
