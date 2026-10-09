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

const Kitchen = () => {

  const date = useSelector(state=>state.data);

  const [isDayShift, setIsDayShift] = useState(true);

  const [data, setData] = useState([]);
  const dayArray = ["Day","Night"];
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

  const sectionData = data.length ? data.filter( item => item.sectionMain === "Kitchen" && item.dayTime === `${dayArray[+!isDayShift]}`) : [];

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full space-y-6 text-start">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  Kitchen Department
                </span>
                <span className="text-zinc-500 text-xs font-mono">• Batch Processing & Yield</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Kitchen Daily Log: <span className="text-primary">{date.date}-{date.month}-2026</span>
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Recipe batch counts, output yield in Kg, worker count allocation, and unit labor cost.
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
              <p className="text-xs text-zinc-500 mt-1">No kitchen production batches logged for this shift date.</p>
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
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Buyer Name</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Product Name</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">No. of Batches</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Yield (Kg)</TableHead>
                      <TableHead className="bg-[#141414] text-primary text-xs font-mono py-3.5">Production (Kg)</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5 text-center">Workers</TableHead>
                      <TableHead className="bg-[#141414] text-primary text-xs font-mono py-3.5 text-center">Cost / Unit</TableHead>
                    </TableRow>
                  </TableHeader>

                  {sectionData.length ? (
                    <TableBody>
                      {(() => {
                        const list = sectionData[0]?.dataList || [];
                        const workers = Number(list[0]?.workersQuantity) || 0;
                        const totalProduction = list.reduce((acc, obj) => acc + obj.batchQuantity * obj.yield, 0);
                        const costPerUnit = totalProduction ? (workers * 900) / totalProduction : 0;
                        return list.map((row, i) => (
                          <TableRow key={row.sNo || i} className="hover:bg-white/[0.03] border-b border-white/5 transition-colors">
                            <TableCell className="font-mono text-xs text-zinc-500 py-3.5">{i + 1}</TableCell>
                            <TableCell className="text-zinc-300 text-xs py-3.5">{row.buyerName}</TableCell>
                            <TableCell className="text-white font-semibold text-xs py-3.5">{row.productName}</TableCell>
                            <TableCell className="font-mono text-xs text-zinc-200 py-3.5">{row.batchQuantity}</TableCell>
                            <TableCell className="font-mono text-xs text-zinc-300 py-3.5">{row.yield}</TableCell>
                            <TableCell className="font-mono text-xs text-primary font-bold py-3.5">
                              {(row.yield * row.batchQuantity).toFixed(2)}
                            </TableCell>
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
                        <TableCell colSpan={3} className="text-primary py-4 uppercase">Batch Total:</TableCell>
                        <TableCell colSpan={2} className="py-4">
                          {sectionData[0].dataList.reduce((accumulator, obj) => accumulator + obj.batchQuantity, 0)} batches
                        </TableCell>
                        <TableCell className="text-primary py-4">
                          {sectionData[0].dataList
                            .reduce((accumulator, obj) => accumulator + obj.batchQuantity * obj.yield, 0)
                            .toFixed(2)}{" "}
                          Kg
                        </TableCell>
                        <TableCell colSpan={2} className="py-4"></TableCell>
                      </TableRow>
                    </TableBody>
                  ) : (
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16 text-zinc-400 text-sm">
                          No production batches logged for this shift.
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

export default Kitchen;
