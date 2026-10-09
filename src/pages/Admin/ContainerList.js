import React, { useState, useEffect } from 'react';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { EXPORT_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader';
import { useNavigate } from 'react-router-dom';
import { Box, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import PageTransition from '../PageTransition';

const ContainerList = () => {
  const { userinfo } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(1);
  const [error, setError] = useState(0);
  const [arr, setArr] = useState([]);
  const [array, setArray] = useState([]);

  const [info] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 60)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const navigate = useNavigate();

  useEffect(() => {
    async function getData() {
      try {
        setError(0);
        setLoading(1);

        const res = await apiConnector(`${EXPORT_URL}/list`, "GET", null, {
          Authorization: `Bearer ${userinfo.token}`,
        });
        setArr(res.data.data);
        setLoading(0);
      } catch (e) {
        setError(1);
        console.log(e);
      }
    }

    async function getInfo() {
      try {
        setError(0);
        setLoading(1);

        const res = await apiConnector(`${EXPORT_URL}/read`, "PUT", info, {
          Authorization: `Bearer ${userinfo.token}`,
        });

        setArray(res.data.data);
        setLoading(0);
      } catch (e) {
        console.log(e);
      }
    }

    getInfo();
    getData();
  }, [userinfo.token, info]);

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full space-y-8 text-start">
          {/* Header Bar */}
          <div className="border-b border-white/10 pb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                Logistics & Exports
              </span>
              <span className="text-zinc-500 text-xs font-mono">• Container Loading Status</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Box className="w-7 h-7 text-primary" />
              Export Container Manifests
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Track multi-SKU filling progress and final container pack completion against 79,200 standard capacity.
            </p>
          </div>

          {error ? (
            <div className="py-24 text-center">
              <p className="text-2xl font-bold text-zinc-400">No Data Entry Found</p>
              <p className="text-xs text-zinc-600 mt-2">Could not retrieve container manifests.</p>
            </div>
          ) : (
            <div>
              {loading ? (
                <Loader />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {arr.map((val, ind) => {
                    const filledCount = array.reduce(
                      (acc, obj) =>
                        acc +
                        obj.dataList
                          .filter((item) => item.container === val.name)
                          .reduce((acc, obj) => acc + obj.pouchQuantity, 0),
                      0
                    );
                    const filledPercent = ((filledCount / 79200) * 100).toFixed(1);

                    const packedCount = array.reduce(
                      (acc, obj) =>
                        acc +
                        obj.dataList
                          .filter((item) => item.container === val.name)
                          .reduce((acc, obj) => acc + obj.pouchPacked, 0),
                      0
                    );
                    const packedPercent = ((packedCount / 79200) * 100).toFixed(1);

                    const isComplete = Number(packedPercent) >= 100;

                    return (
                      <div
                        key={ind}
                        onClick={() => navigate(`${val._id}`)}
                        className="group cursor-pointer rounded-2xl border border-white/10 bg-[#0d0d0d]/90 hover:bg-[#141414] p-6 transition-all duration-300 backdrop-blur-xl shadow-xl hover:border-primary/40 hover:-translate-y-1 relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/30 transition-colors">
                              <Box className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                                {val.name}
                                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                              </h3>
                              <span className="text-xs font-mono text-zinc-500">ID: {val._id.slice(-6)}</span>
                            </div>
                          </div>

                          {isComplete ? (
                            <span className="px-2.5 py-1 rounded-full text-[12px] font-mono font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[12px] font-mono font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> In Progress
                            </span>
                          )}
                        </div>

                        {/* Progress Bars */}
                        <div className="space-y-4 my-5 pt-2">
                          {/* Filling Progress */}
                          <div>
                            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                              <span className="text-zinc-400">Filling Progress:</span>
                              <span className="text-emerald-400 font-bold">{filledPercent}%</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                              <div
                                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(Number(filledPercent), 100)}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-[13px] font-mono text-zinc-500 mt-1">
                              <span>{filledCount.toLocaleString()} Pouches</span>
                              <span>Cap: 79,200</span>
                            </div>
                          </div>

                          {/* Dispatch Packing Progress */}
                          <div>
                            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                              <span className="text-zinc-400">Dispatch Packed:</span>
                              <span className="text-cyan-400 font-bold">{packedPercent}%</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                              <div
                                className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(Number(packedPercent), 100)}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-[13px] font-mono text-zinc-500 mt-1">
                              <span>{packedCount.toLocaleString()} Packed</span>
                              <span>Cap: 79,200</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
                          <span>Inspect Manifest Ledger</span>
                          <span className="text-primary font-bold">→</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default ContainerList;
