import React, {useState, useEffect} from 'react'
import { apiConnector } from '../../redux/Utils/apiConnector';
import { DISPATCH_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import { Input } from "../../components/Input";
import { useSelector } from 'react-redux';
import {toast} from 'react-toastify';
import PageTransition from '../PageTransition';

const DispatchReport = () => {

    const [loading, setLoading] = useState(0);
    const [data, setData] = useState([]);
    const [error, setError] = useState(0);

    const {userinfo} = useSelector(state=>state.auth);

    useEffect(() => {
          
async function getData(){

  setLoading(1);

    try {

      const res = await apiConnector(`${DISPATCH_URL}/dispatchReport`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});
      setData(res.data.data);
      setLoading(0);

    } catch (error) {
      setLoading(0);
      toast(error.response.data.message)
    }
  }
      
      getData();

      }, [userinfo.token]);

    const [info, setInfo] = useState({
        start:"",
        end:"",
    }); 

async function getReport(){
        try {
          setError(0);
          const res = await apiConnector(`${DISPATCH_URL}/dispatchDateReport`,"PUT",info,{Authorization: `Bearer ${userinfo.token}`});
          setData(res.data.data);
          setLoading(0);
        } catch (error) {
          setError(1);
          setLoading(0);
          toast(error.response.data.message);
        }
      }
    
    const inputHandler = async(e) =>{
        setInfo((prevData) => ({
          ...prevData,
          [e.target.name]: e.target.value
        }));
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
                Logistics & Outbound
              </span>
              <span className="text-zinc-500 text-xs font-mono">• Dispatch Archives</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dispatch Shipment Report
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Query completed outbound shipments across custom date ranges.
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
              onClick={getReport}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-primary/20 transition-all cursor-pointer"
            >
              Filter Ledger
            </button>
          </div>
        </div>

        {error ? (
          <div className="py-24 text-center">
            <p className="text-2xl font-bold text-zinc-400">No Data Entry Found</p>
            <p className="text-xs text-zinc-600 mt-2">No dispatch shipment records match the selected date filter.</p>
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
                        <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Dispatch Date</TableHead>
                        <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Buyer Name</TableHead>
                        <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Product Name</TableHead>
                        <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Dispatched</TableHead>
                        <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Carton Box Count</TableHead>
                      </TableRow>
                    </TableHeader>

                    {data.length ? (
                      <TableBody>
                        {data.map((val, ind) => (
                          <TableRow key={ind} className="hover:bg-white/[0.03] border-b border-white/5 transition-colors">
                            <TableCell className="font-mono text-xs text-zinc-300 py-3">
                              {val.lDate?.substring(0, 10).split("-").reverse().join("-")}
                            </TableCell>
                            <TableCell className="text-xs text-white font-medium py-3">{val.buyerName}</TableCell>
                            <TableCell className="text-xs text-zinc-300 py-3">{val.productName}</TableCell>
                            <TableCell className="font-mono text-xs text-emerald-400 font-bold py-3">{val.pouchDispatched}</TableCell>
                            <TableCell className="font-mono text-xs text-cyan-400 py-3">{val.box}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    ) : (
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-zinc-500 font-mono text-xs">
                            No dispatch entries available in selected range
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
}

export default DispatchReport
