import { Button } from "../../components/Buttons";
import { Input } from "../../components/Input";
import { Search, Filter } from "lucide-react";
import React, { useEffect, useState, useMemo } from 'react';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { PRODUCT_URL, CATEGORIES_URL, DATA_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';
import PageTransition from '../PageTransition';

const norm = (str) => String(str || '').trim().toLowerCase();

const Index = () => {
  const [arr, setarr] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(1);
  const [loading2, setLoading2] = useState(0);
  const [error, setError] = useState(0);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [openBox, setopenBox] = useState(false);
  const [categories, setcategories] = useState([]);
  const [info, setInfo] = useState({
    start: "",
    end: "",
    product: ""
  });

  const { userinfo } = useSelector((state) => state.auth);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setError(0);
        const [prodRes, catRes] = await Promise.all([
          apiConnector(`${PRODUCT_URL}/products`, "GET"),
          apiConnector(`${CATEGORIES_URL}/categories`, "GET")
        ]);
        setAllProducts(prodRes.data.data || []);
        setcategories(catRes.data.data || []);
        setLoading(0);
      } catch (err) {
        console.log(err);
        setError(1);
        setLoading(0);
      }
    }

    loadInitialData();
  }, [userinfo.token]);

  const filteredProducts = useMemo(() => {
    return (allProducts || [])
      .filter((item) => {
        if (selectedBuyer && norm(item.buyer) !== norm(selectedBuyer)) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = norm(searchQuery);
          return norm(item.name).includes(q) || norm(item.buyer).includes(q);
        }
        return true;
      })
      .slice()
      .sort((a, b) => {
        const bC = (a.buyer || "").trim().localeCompare((b.buyer || "").trim());
        if (bC !== 0) return bC;
        return (a.name || "").trim().localeCompare((b.name || "").trim());
      });
  }, [allProducts, selectedBuyer, searchQuery]);

  const inputHandler = (e) => {
    setInfo((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value
    }));
  };

  async function getData() {
    if (!info.start || !info.end) {
      toast.warn("Please select both From and To dates");
      return;
    }
    if (!info.product || (!info.product.name && !info.product.buyer)) {
      toast.warn("Please select a product or buyer from the left directory");
      return;
    }

    setLoading2(1);

    const startParts = info.start.split("-").map(Number);
    const endParts = info.end.split("-").map(Number);
    const startUtc = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);
    const endUtc = Date.UTC(endParts[0], endParts[1] - 1, endParts[2]);

    const dateKeys = [];
    for (let t = startUtc; t <= endUtc; t += 86400000) {
      dateKeys.push(new Date(t).toISOString().substring(0, 10));
    }
    setarr(dateKeys);

    try {
      const res = await apiConnector(
        `${DATA_URL}/Product`,
        "PUT",
        info,
        { Authorization: `Bearer ${userinfo.token}` }
      );
      setData(res.data.data || []);
      setLoading2(0);
    } catch (err) {
      setData([]);
      setLoading2(0);
      toast(err?.response?.data?.message || "No data found for selection");
    }
  }

  const { dailyRows, totals } = useMemo(() => {
    const targetName = norm(info.product?.name);
    const targetBuyer = norm(info.product?.buyer);
    const isAllProductsForBuyer = targetName === "all";

    const byDate = {};
    for (const dateKey of arr) {
      byDate[dateKey] = {
        dateKey,
        kitchenKg: 0,
        fillingPouches: 0,
        dispatchPouches: 0,
        wastage: 0,
        boxes: 0
      };
    }

    const grandTotals = {
      kitchenKg: 0,
      fillingPouches: 0,
      dispatchPouches: 0,
      wastage: 0,
      boxes: 0
    };

    for (const doc of data || []) {
      const dateKey = String(doc.createdAt || "").substring(0, 10);
      const bucket = byDate[dateKey];

      for (const entry of doc.dataList || []) {
        const entryBuyer = norm(entry.buyerName);
        const entryProduct = norm(entry.productName);

        const buyerMatches = !targetBuyer || entryBuyer === targetBuyer;
        const productMatches = isAllProductsForBuyer || !targetName || entryProduct === targetName;

        if (!buyerMatches || !productMatches) continue;

        const kKg = (Number(entry.yield) || 0) * (Number(entry.batchQuantity) || 0);
        const fPouch = Number(entry.pouchQuantity) || 0;
        const dPouch = Number(entry.pouchPacked) || 0;
        const w =
          (Number(entry.empty) || 0) +
          (Number(entry.leaked) || 0) +
          (Number(entry.foreignMatter) || 0);
        const bx = Number(entry.box) || 0;

        if (bucket) {
          bucket.kitchenKg += kKg;
          bucket.fillingPouches += fPouch;
          bucket.dispatchPouches += dPouch;
          bucket.wastage += w;
          bucket.boxes += bx;
        }

        grandTotals.kitchenKg += kKg;
        grandTotals.fillingPouches += fPouch;
        grandTotals.dispatchPouches += dPouch;
        grandTotals.wastage += w;
        grandTotals.boxes += bx;
      }
    }

    return {
      dailyRows: arr.map((d) => byDate[d]),
      totals: grandTotals
    };
  }, [arr, data, info.product]);

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
        {error ? (
          <div className="w-full p-16 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
            <p className="text-xl font-bold text-zinc-400">No Data Entry Found</p>
            <p className="text-xs text-zinc-500 mt-1">Please check your network connection or try a different filter.</p>
          </div>
        ) : loading ? (
          <Loader />
        ) : (
          <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                    Production Analytics
                  </span>
                  <span className="text-zinc-500 text-xs font-mono">• Product Matrix</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Product History & Shift Breakdown
                </h1>
                <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                  Select a product (or buyer) and date range to inspect cross-departmental throughput (Kitchen, Filling, Dispatch).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-primary/20 transition-all cursor-pointer"
                  onClick={() => {
                    setarr([]);
                    getData();
                  }}
                >
                  {loading2 ? "Querying..." : "Run Analysis Query"}
                </button>
              </div>
            </div>

            {loading2 ? (
              <Loader />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Product Directory */}
                <div className="lg:col-span-5 bg-[#0d0d0d]/90 border border-white/10 rounded-2xl p-5 shadow-xl backdrop-blur-xl relative">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Product Directory</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                        {filteredProducts?.length || 0}
                      </span>
                    </h2>
                    <Button
                      variant="outline"
                      className="border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs px-3 py-1.5 rounded-xl h-8"
                      onClick={() => setopenBox(!openBox)}
                    >
                      <Filter className="w-3.5 h-3.5 mr-1.5" />
                      {selectedBuyer ? selectedBuyer : "Buyer Filter"}
                    </Button>
                  </div>

                  {/* Filter Dropdown Popup */}
                  {openBox && (
                    <div className="absolute right-5 top-16 z-30 bg-[#141414] border border-white/15 rounded-xl p-2 shadow-2xl max-h-60 overflow-y-auto w-48 text-xs">
                      <div
                        className="p-2 hover:bg-white/10 rounded-lg cursor-pointer text-zinc-300 hover:text-white"
                        onClick={() => {
                          setSelectedBuyer("");
                          setopenBox(false);
                        }}
                      >
                        All Buyers
                      </div>
                      {categories
                        .slice()
                        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                        .map((val, ind) => (
                          <div
                            className="p-2 hover:bg-primary hover:text-black rounded-lg cursor-pointer text-zinc-300 transition-colors"
                            key={ind}
                            onClick={() => {
                              setSelectedBuyer(val.name);
                              setInfo((prevData) => ({
                                ...prevData,
                                product: { name: "ALL", buyer: val.name }
                              }));
                              setopenBox(false);
                            }}
                          >
                            {val.name}
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="relative mb-4">
                    <Input
                      type="text"
                      value={searchQuery}
                      placeholder="Search products or buyers..."
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-black border border-white/10 rounded-xl pl-9 text-xs py-2 w-full text-white placeholder-zinc-500 focus:border-primary"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-3.5 h-3.5" />
                  </div>

                  <div className="overflow-y-auto max-h-[32rem] rounded-xl border border-white/10">
                    <table className="w-full text-left">
                      <thead className="bg-[#141414] sticky top-0 z-10 border-b border-white/10">
                        <tr>
                          <th className="py-2.5 px-3 text-xs font-mono text-zinc-400">#</th>
                          <th className="py-2.5 px-3 text-xs font-mono text-zinc-400">Buyer</th>
                          <th className="py-2.5 px-3 text-xs font-mono text-zinc-400">Product Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedBuyer && (
                          <tr
                            onClick={() =>
                              setInfo((prevData) => ({
                                ...prevData,
                                product: { name: "ALL", buyer: selectedBuyer }
                              }))
                            }
                            className={`cursor-pointer transition-colors text-xs ${
                              norm(info.product?.name) === "all" &&
                              norm(info.product?.buyer) === norm(selectedBuyer)
                                ? "bg-primary/15 text-primary font-bold border-l-2 border-primary"
                                : "bg-white/[0.02] hover:bg-white/[0.05] text-amber-300"
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-amber-400">★</td>
                            <td className="py-2.5 px-3 font-semibold">{selectedBuyer}</td>
                            <td className="py-2.5 px-3 font-bold">
                              All {selectedBuyer} Products (Combined)
                            </td>
                          </tr>
                        )}
                        {filteredProducts.map((val, i) => {
                          const isSelected =
                            norm(info.product?.name) === norm(val.name) &&
                            norm(info.product?.buyer) === norm(val.buyer);
                          return (
                            <tr
                              key={val._id || i}
                              onClick={() => {
                                setInfo((prevData) => ({
                                  ...prevData,
                                  product: val
                                }));
                              }}
                              className={`cursor-pointer transition-colors text-xs ${
                                isSelected
                                  ? "bg-primary/15 text-primary font-bold border-l-2 border-primary"
                                  : "hover:bg-white/[0.03] text-zinc-300"
                              }`}
                            >
                              <td className="py-2.5 px-3 font-mono text-zinc-500">{i + 1}</td>
                              <td className="py-2.5 px-3">{val.buyer}</td>
                              <td className="py-2.5 px-3 font-medium text-white">{val.name}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Column: Production Overview Matrix */}
                <div className="lg:col-span-7 bg-[#0d0d0d]/90 border border-white/10 rounded-2xl p-5 shadow-xl backdrop-blur-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-white">Production Cross-Section Overview</h2>
                      <div className="text-xs font-mono text-primary mt-1">
                        {info.product?.name ? (
                          <span>
                            Selected:{" "}
                            <strong>
                              {norm(info.product.name) === "all"
                                ? `All ${info.product.buyer} Products`
                                : info.product.name}
                            </strong>{" "}
                            ({info.product.buyer})
                          </span>
                        ) : (
                          <span className="text-zinc-500">← Click a product from the directory on the left</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-black border border-white/10 px-2.5 py-1.5 rounded-xl">
                        <span className="text-[12px] font-mono text-zinc-400 uppercase">From:</span>
                        <input
                          type="date"
                          name="start"
                          value={info.start}
                          onChange={(e) => inputHandler(e)}
                          className="bg-transparent border-0 text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 bg-black border border-white/10 px-2.5 py-1.5 rounded-xl">
                        <span className="text-[12px] font-mono text-zinc-400 uppercase">To:</span>
                        <input
                          type="date"
                          name="end"
                          value={info.end}
                          onChange={(e) => inputHandler(e)}
                          className="bg-transparent border-0 text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[32rem] rounded-xl border border-white/10">
                    <table className="w-full text-left">
                      <thead className="bg-[#141414] sticky top-0 z-10 border-b border-white/10">
                        <tr>
                          <th className="py-3 px-3.5 text-xs font-mono text-zinc-400">Date</th>
                          <th className="py-3 px-3.5 text-xs font-mono text-zinc-400">Kitchen (Kg)</th>
                          <th className="py-3 px-3.5 text-xs font-mono text-zinc-400">Filling (P)</th>
                          <th className="py-3 px-3.5 text-xs font-mono text-zinc-400">Dispatch (P)</th>
                          <th className="py-3 px-3.5 text-xs font-mono text-amber-400">Wastage</th>
                          <th className="py-3 px-3.5 text-xs font-mono text-zinc-400">Boxes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-xs">
                        {dailyRows.map((row, i) => (
                          <tr key={row.dateKey || i} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 px-3.5 text-zinc-400">{row.dateKey?.substring(5, 10)}</td>
                            <td className="py-2.5 px-3.5 text-zinc-200">{row.kitchenKg.toFixed(2)}</td>
                            <td className="py-2.5 px-3.5 text-white font-semibold">{row.fillingPouches}</td>
                            <td className="py-2.5 px-3.5 text-zinc-200">{row.dispatchPouches}</td>
                            <td className="py-2.5 px-3.5 text-amber-400">{row.wastage}</td>
                            <td className="py-2.5 px-3.5 text-zinc-400">{row.boxes}</td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot className="bg-[#141414] font-mono text-xs font-bold border-t border-white/10 sticky bottom-0">
                        <tr>
                          <td className="py-3 px-3.5 text-primary uppercase">Total</td>
                          <td className="py-3 px-3.5 text-white">{totals.kitchenKg.toFixed(2)}</td>
                          <td className="py-3 px-3.5 text-primary">{totals.fillingPouches}</td>
                          <td className="py-3 px-3.5 text-white">{totals.dispatchPouches}</td>
                          <td className="py-3 px-3.5 text-amber-400">{totals.wastage}</td>
                          <td className="py-3 px-3.5 text-white">{totals.boxes}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default Index;
