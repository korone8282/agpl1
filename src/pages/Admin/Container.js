import React, { useState, useEffect } from 'react';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { EXPORT_URL } from '../../redux/Utils/constants';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import { Box, Trash2, ArrowLeft, Layers } from "lucide-react";
import PageTransition from '../PageTransition';

const Container = () => {
  const { userinfo } = useSelector((state) => state.auth);

  const [info] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 60)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const exportId = useLocation().pathname.split("/")[3];
  const navigate = useNavigate();

  const [loading, setLoading] = useState(1);
  const [error, setError] = useState(0);
  const [arr, setArr] = useState([]);
  const [array, setArray] = useState([]);

  useEffect(() => {
    async function getData() {
      try {
        setError(0);
        setLoading(1);

        const res = await apiConnector(`${EXPORT_URL}/${exportId}`, "GET", null, {
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
  }, [userinfo.token, exportId, info]);

  async function deleteExport() {
    try {
      setError(0);
      setLoading(1);

      await apiConnector(`${EXPORT_URL}/${exportId}`, "DELETE", null, {
        Authorization: `Bearer ${userinfo.token}`,
      });
      toast("Deleted Successfully");
      navigate("/admin/Container-List");
    } catch (e) {
      setError(1);
      console.log(e);
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
                <button
                  type="button"
                  onClick={() => navigate("/admin/Container-List")}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Containers
                </button>
                <span className="text-zinc-600 text-xs">•</span>
                <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  Manifest Detail
                </span>
                {arr?.priority && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                    Priority #{arr.priority}
                  </span>
                )}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold uppercase ${
                  (arr?.type || 'Export').toLowerCase() === 'domestic'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {arr?.type || 'Export'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <Box className="w-7 h-7 text-primary" />
                Container: <span className="text-primary">{arr?.name || "Loading..."}</span>
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Per-SKU fulfillment reconciliation against planned container quota ({arr?.list?.length || 0} SKUs sorted alphabetically).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={deleteExport}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Manifest
              </button>
            </div>
          </div>

          {error ? (
            <div className="py-24 text-center">
              <p className="text-2xl font-bold text-zinc-400">No Data Entry Found</p>
              <p className="text-xs text-zinc-600 mt-2">Could not retrieve details for this container.</p>
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
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">#</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Buyer Name</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Product Name</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pack Size (Kg)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Goal (Pouches)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Filled</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Packed</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Loss (Disp)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Rem. (Filling)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Rem. (Dispatch)</TableHead>
                        </TableRow>
                      </TableHeader>

                      {arr && arr.list && (
                        <TableBody>
                          {arr.list
                            .slice()
                            .sort((a, b) => {
                              const bComp = (a.buyerName || "").localeCompare(b.buyerName || "");
                              if (bComp !== 0) return bComp;
                              return (a.productName || "").localeCompare(b.productName || "");
                            })
                            .map((val, ind) => {
                            const filledCount = array
                              .filter((product) => product.sectionMain === "Filling")
                              .reduce(
                                (acc, obj) =>
                                  acc +
                                  obj.dataList
                                    .filter(
                                      (item) =>
                                        item.productName === val.productName &&
                                        item.buyerName === val.buyerName &&
                                        item.packSize === val.packSize &&
                                        item.container === arr.name
                                    )
                                    .reduce((accumulator, object) => accumulator + object.pouchQuantity, 0),
                                0
                              );

                            const packedCount = array
                              .filter((product) => product.sectionMain === "Dispatch")
                              .reduce(
                                (acc, obj) =>
                                  acc +
                                  obj.dataList
                                    .filter(
                                      (item) =>
                                        item.productName === val.productName &&
                                        item.buyerName === val.buyerName &&
                                        item.packSize === val.packSize &&
                                        item.container === arr.name
                                    )
                                    .reduce((accumulator, object) => accumulator + object.pouchPacked, 0),
                                0
                              );

                            const leakedCount = array
                              .filter((product) => product.sectionMain === "Dispatch")
                              .reduce(
                                (acc, obj) =>
                                  acc +
                                  obj.dataList
                                    .filter(
                                      (item) =>
                                        item.productName === val.productName &&
                                        item.buyerName === val.buyerName &&
                                        item.packSize === val.packSize &&
                                        item.container === arr.name
                                    )
                                    .reduce((accumulator, object) => accumulator + object.leaked, 0),
                                0
                              );

                            const remFilling = val.pouch - filledCount;
                            const remDispatch = val.pouch - packedCount;
                            const isPending = remFilling > 0;

                            return (
                              <React.Fragment key={ind}>
                                {/* Master Product Row */}
                                <TableRow
                                  className={`border-b border-white/10 transition-colors ${
                                    isPending
                                      ? "bg-amber-500/[0.04] hover:bg-amber-500/[0.08]"
                                      : "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]"
                                  }`}
                                >
                                  <TableCell className="font-mono text-xs text-zinc-400 py-3.5 font-bold">
                                    {ind + 1}
                                  </TableCell>
                                  <TableCell className="text-xs text-white font-semibold py-3.5">
                                    {val.buyerName}
                                  </TableCell>
                                  <TableCell className="text-xs text-white font-bold py-3.5 flex items-center gap-2">
                                    <Layers className="w-3.5 h-3.5 text-primary" />
                                    {val.productName}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-zinc-300 py-3.5">
                                    {val.packSize} kg
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-primary font-bold py-3.5">
                                    {val.pouch?.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-emerald-400 font-bold py-3.5">
                                    {filledCount?.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-cyan-400 font-bold py-3.5">
                                    {packedCount?.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-rose-400 py-3.5">
                                    {leakedCount?.toLocaleString()}
                                  </TableCell>
                                  <TableCell
                                    className={`font-mono text-xs font-bold py-3.5 ${
                                      remFilling > 0 ? "text-amber-400" : "text-emerald-400"
                                    }`}
                                  >
                                    {remFilling?.toLocaleString()}
                                  </TableCell>
                                  <TableCell
                                    className={`font-mono text-xs font-bold py-3.5 ${
                                      remDispatch > 0 ? "text-amber-400" : "text-emerald-400"
                                    }`}
                                  >
                                    {remDispatch?.toLocaleString()}
                                  </TableCell>
                                </TableRow>

                                {/* Per-Date Shift Production Breakdown */}
                                {array?.map((v) =>
                                  v.dataList
                                    .filter(
                                      (item) =>
                                        item.productName === val.productName &&
                                        item.buyerName === val.buyerName &&
                                        item.packSize === val.packSize &&
                                        item.container === arr.name
                                    )
                                    .map((subItem, subInd) => (
                                      <TableRow
                                        key={subInd}
                                        className="bg-black/60 hover:bg-white/[0.02] border-b border-white/5 font-mono text-[13px] text-zinc-400"
                                      >
                                        <TableCell className="py-2 text-zinc-500 pl-6">
                                          ↳ {v.createdAt?.slice(5, 10)}
                                        </TableCell>
                                        <TableCell className="py-2 text-zinc-500">{subItem.buyerName}</TableCell>
                                        <TableCell className="py-2 text-zinc-300">{subItem.productName}</TableCell>
                                        <TableCell className="py-2 text-zinc-400">{subItem.packSize}</TableCell>
                                        <TableCell className="py-2 text-zinc-500">
                                          Batch #{subItem.batch}
                                        </TableCell>
                                        <TableCell className="py-2 text-emerald-400">
                                          {subItem.pouchQuantity || "—"}
                                        </TableCell>
                                        <TableCell className="py-2 text-cyan-400">
                                          {subItem.pouchPacked || "—"}
                                        </TableCell>
                                        <TableCell className="py-2 text-rose-400">
                                          {subItem.leaked || "—"}
                                        </TableCell>
                                        <TableCell className="py-2 text-zinc-600">—</TableCell>
                                        <TableCell className="py-2 text-zinc-600">—</TableCell>
                                      </TableRow>
                                    ))
                                )}
                              </React.Fragment>
                            );
                          })}
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

export default Container;
