import React, {useState, useEffect} from 'react'
import Loader from '../../components/Loader';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/Popover";
import { Button } from "../../components/Buttons";
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { DATA_URL } from '../../redux/Utils/constants';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import PageTransition from '../PageTransition';

const Monthly = () => {

  const {userinfo} = useSelector(state => state.auth);

  const pSize = [0.125,0.13,0.175,0.2,0.22,0.225,0.25,0.3,0.35,0.375,0.4,0.45,0.5,0.6,1];

  const [data, setData] = useState([]);
  const [month, setmonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(1);
  const [error, setError] = useState(0);
  const [isOpen, setIsOpen] = useState(false)

  const months = [{month:"January"},
                  {month:"February"},
                  {month:"March"},
                  {month:"April"},
                  {month:"May"},
                  {month:"June"},
                  {month:"July"},
                  {month:"August"},
                  {month:"September"},
                  {month:"October"},
                  {month:"November"},
                  {month:"December"}
                 ];
              
                 useEffect(() => {
                  
                  async function getData(){
                    try {
                    setLoading(1);
                      setError(0);
                      const res = await apiConnector(`${DATA_URL}/List/${month}`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});
                      
                      setData(res.data.data);          
                      
                    setLoading(0);
                
                    } catch (e) {
                      setError(1);
                      console.log(e);
                    }
                  }

                  getData();
                 }, [month,userinfo.token]);

  let sum = 0;

  function myFunction(item) {
    let size = item;
    sum += ((item+0.005)*data.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.packSize === size).reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0),0))
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
                  Analytics & Reports
                </span>
                <span className="text-zinc-500 text-xs font-mono">• Monthly Consolidation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Monthly Performance Report: <span className="text-primary">{months[month - 1].month}</span>
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Aggregated pouch production, net yield, and packaging loss across sizes.
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
                <PopoverContent className="w-[300px] p-3 bg-[#111111] border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl">
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
                          setIsOpen(false);
                          setmonth(index + 1);
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
              <p className="text-xs text-zinc-600 mt-2">No shift log entries recorded for {months[month - 1].month}.</p>
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
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Size (Kg)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Yield (Kg)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Filled</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Total (Kg)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Packed</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Wasted (Filling)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Wasted (Dispatch)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Wastage (Kg)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">No. Of Box</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">No. of Worker</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {pSize.map((ele, index) => (
                          <TableRow key={index} className="hover:bg-white/[0.03] border-b border-white/5 transition-colors">
                            <TableCell className="font-mono text-xs font-semibold text-white py-3">{ele} kg</TableCell>
                            <TableCell className="font-mono text-xs text-zinc-300 py-3">
                              {data
                                .reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList
                                      .filter((item) => item.packSize === ele)
                                      .reduce((accumulator, obj) => accumulator + obj.yield * obj.batchQuantity, 0),
                                  0
                                )
                                .toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-emerald-400 font-bold py-3">
                              {data.reduce(
                                (acc, obj) =>
                                  acc +
                                  obj.dataList
                                    .filter((item) => item.packSize === ele)
                                    .reduce((accumulator, obj) => accumulator + obj.pouchQuantity, 0),
                                0
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-zinc-300 py-3">
                              {(
                                ele *
                                data.reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList
                                      .filter((item) => item.packSize === ele)
                                      .reduce((accumulator, obj) => accumulator + obj.pouchQuantity, 0),
                                  0
                                )
                              ).toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-cyan-400 py-3">
                              {data.reduce(
                                (acc, obj) =>
                                  acc +
                                  obj.dataList
                                    .filter((item) => item.packSize === ele)
                                    .reduce((accumulator, obj) => accumulator + obj.pouchPacked, 0),
                                0
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-amber-400 py-3">
                              {data.reduce(
                                (acc, obj) =>
                                  acc +
                                  obj.dataList
                                    .filter((item) => item.packSize === ele)
                                    .reduce((accumulator, obj) => accumulator + obj.empty, 0),
                                0
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-rose-400 py-3">
                              {data.reduce(
                                (acc, obj) =>
                                  acc +
                                  obj.dataList
                                    .filter((item) => item.packSize === ele)
                                    .reduce((accumulator, obj) => accumulator + obj.leaked, 0),
                                0
                              ) +
                                data.reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList
                                      .filter((item) => item.packSize === ele)
                                      .reduce((accumulator, obj) => accumulator + obj.foreignMatter, 0),
                                  0
                                )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-rose-300 py-3">
                              {data
                                .reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList
                                      .filter((item) => item.packSize === ele)
                                      .reduce((accumulator, obj) => accumulator + obj.filled, 0),
                                  0
                                )
                                .toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-zinc-200 py-3">
                              {data.reduce(
                                (acc, obj) =>
                                  acc +
                                  obj.dataList
                                    .filter((item) => item.packSize === ele)
                                    .reduce((accumulator, obj) => accumulator + obj.box, 0),
                                0
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-zinc-500 py-3">-</TableCell>
                          </TableRow>
                        ))}

                        {/* Summary Total Row */}
                        <TableRow className="bg-primary/10 font-bold border-t-2 border-primary/40">
                          <TableCell className="font-mono text-xs text-primary uppercase tracking-wider py-4">Total:</TableCell>
                          <TableCell className="font-mono text-xs text-white py-4">
                            {data
                              .reduce(
                                (acc, obj) =>
                                  acc +
                                  obj.dataList.reduce(
                                    (accumulator, obj) => accumulator + obj.yield * obj.batchQuantity,
                                    0
                                  ),
                                0
                              )
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-emerald-400 py-4">
                            {data.reduce(
                              (acc, obj) =>
                                acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.pouchQuantity, 0),
                              0
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-white py-4">
                            {pSize.forEach(myFunction)} {sum.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-cyan-400 py-4">
                            {data.reduce(
                              (acc, obj) =>
                                acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.pouchPacked, 0),
                              0
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-amber-400 py-4">
                            {data.reduce(
                              (acc, obj) =>
                                acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.empty, 0),
                              0
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-rose-400 py-4">
                            {data.reduce(
                              (acc, obj) =>
                                acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.leaked, 0),
                              0
                            ) +
                              data.reduce(
                                (acc, obj) =>
                                  acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.foreignMatter, 0),
                                0
                              )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-rose-300 py-4">
                            {data
                              .reduce(
                                (acc, obj) =>
                                  acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.filled, 0),
                                0
                              )
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-100 py-4">
                            {data.reduce(
                              (acc, obj) =>
                                acc + obj.dataList.reduce((accumulator, obj) => accumulator + obj.box, 0),
                              0
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-primary py-4">
                            {data.reduce(
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
}

export default Monthly
