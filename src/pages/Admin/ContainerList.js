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

  const [typeFilter, setTypeFilter] = useState("All"); // "All", "Export", "Domestic"

  const exportCount = arr.filter((v) => (v.type || "Export").toLowerCase() === "export").length;
  const domesticCount = arr.filter((v) => (v.type || "").toLowerCase() === "domestic").length;

  const filteredAndSortedArr = arr
    .filter((val) => {
      if (typeFilter === "All") return true;
      const itemType = val.type || "Export";
      return itemType.toLowerCase() === typeFilter.toLowerCase();
    })
    .sort((a, b) => {
      const pA = a.priority !== undefined && a.priority !== null && a.priority !== '' ? Number(a.priority) : 999;
      const pB = b.priority !== undefined && b.priority !== null && b.priority !== '' ? Number(b.priority) : 999;
      if (pA !== pB) {
        return pA - pB;
      }
      return (a.name || "").localeCompare(b.name || "");
    });

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full space-y-6 text-start">
          {/* Header Bar */}
          <div className="border-b border-white/10 pb-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                    Logistics & Containers
                  </span>
                  <span className="text-zinc-500 text-xs font-mono">• Manifest Queue</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                  <Box className="w-7 h-7 text-primary" />
                  Container Manifests
                </h1>
                <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                  Track multi-SKU filling progress and final packing completion against planned container pouch quotas.
                </p>
              </div>

              {/* Filter Tabs & Actions */}
              <div className="flex items-center gap-2 bg-[#0d0d0d] p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setTypeFilter("All")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    typeFilter === "All"
                      ? "bg-white/20 text-white font-bold shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  All ({arr.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("Export")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    typeFilter === "Export"
                      ? "bg-primary text-black font-bold shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Export ({exportCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("Domestic")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    typeFilter === "Domestic"
                      ? "bg-cyan-400 text-black font-bold shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Domestic ({domesticCount})
                </button>
              </div>
            </div>
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
              ) : filteredAndSortedArr.length === 0 ? (
                <div className="py-20 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
                  <Box className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-base font-semibold text-zinc-300">No {typeFilter !== "All" ? typeFilter : ""} Containers Found</p>
                  <p className="text-xs text-zinc-500 mt-1">Create an export or domestic container to initialize manifests.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedArr.map((val, ind) => {
                    const totalPouches = (val.list || []).reduce(
                      (acc, item) => acc + (Number(item.pouch) || 0),
                      0
                    );
                    const targetCap = totalPouches > 0 ? totalPouches : 79200;

                    const filledCount = array.reduce(
                      (acc, obj) =>
                        acc +
                        obj.dataList
                          .filter((item) => item.container === val.name)
                          .reduce((acc, obj) => acc + obj.pouchQuantity, 0),
                      0
                    );
                    const filledPercent = targetCap > 0 ? ((filledCount / targetCap) * 100).toFixed(1) : "0.0";

                    const packedCount = array.reduce(
                      (acc, obj) =>
                        acc +
                        obj.dataList
                          .filter((item) => item.container === val.name)
                          .reduce((acc, obj) => acc + obj.pouchPacked, 0),
                      0
                    );
                    const packedPercent = targetCap > 0 ? ((packedCount / targetCap) * 100).toFixed(1) : "0.0";

                    const isComplete = Number(packedPercent) >= 100;

                    return (
                      <div
                        key={val._id || ind}
                        onClick={() => navigate(`${val._id}`)}
                        className="group cursor-pointer rounded-2xl border border-white/10 bg-[#0d0d0d]/90 hover:bg-[#141414] p-6 transition-all duration-300 backdrop-blur-xl shadow-xl hover:border-primary/40 hover:-translate-y-1 relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/30 transition-colors">
                              <Box className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                                  {val.name}
                                  <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                                </h3>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                                  Priority #{val.priority || 1}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                                  (val.type || 'Export').toLowerCase() === 'domestic'
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  {val.type || 'Export'}
                                </span>
                                <span className="text-[11px] font-mono text-zinc-500 ml-1">ID: {val._id.slice(-6)}</span>
                              </div>
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
                              <span>Target: {targetCap.toLocaleString()}</span>
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
                              <span>Target: {targetCap.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
                          <span>Inspect Manifest Ledger ({val.list?.length || 0} SKUs)</span>
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
