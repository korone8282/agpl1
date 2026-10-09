import React, { useEffect, useState } from 'react';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { PRODUCT_URL, CATEGORIES_URL, DATA_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import { toast } from 'react-toastify';
import { Input } from "../../components/Input";
import { Search, Filter, PackageSearch } from "lucide-react";
import PageTransition from '../PageTransition';

const Left = () => {
  const [data, setData] = useState([]);
  const [info, setInfo] = useState({
    start: "",
    end: "",
    buyer: "",
    product: "",
  });

  const [loading2, setLoading2] = useState(0);
  const [search, setsearch] = useState("");
  const [ogData, setogData] = useState([]);
  const [dummy, setdummy] = useState();
  const [products2, setproducts2] = useState([]);
  const [error, setError] = useState(0);
  const [products, setproducts] = useState([]);
  const [categories, setcategories] = useState([]);

  const inputHandler = async (e) => {
    setInfo((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }));
  };

  const { userinfo } = useSelector((state) => state.auth);

  useEffect(() => {
    async function getProducts() {
      try {
        const res = await apiConnector(`${PRODUCT_URL}/products`, "GET");
        setproducts(res.data.data);
      } catch (error) {
        console.log(error);
      }
    }

    async function getCategories() {
      try {
        setError(0);
        const res = await apiConnector(`${CATEGORIES_URL}/categories`, "GET");
        setcategories(res.data.data);
      } catch (error) {
        setError(1);
        console.log(error);
      }
    }

    async function getData() {
      setLoading2(1);
      try {
        const res = await apiConnector(`${DATA_URL}/Left`, "GET", null, {
          Authorization: `Bearer ${userinfo.token}`,
        });
        setData(res.data.data);
        setogData(res.data.data);
        setdummy(res.data.data);
        setLoading2(0);
      } catch (error) {
        setLoading2(0);
        toast(error.response?.data?.message || "Failed to load data");
      }
    }

    getCategories();
    getProducts();
    getData();
  }, [userinfo.token]);

  function handleSearch(val) {
    if (val === "") {
      setData(dummy);
      return;
    }

    setsearch(val);

    let filterBySearch = ogData.filter((item) => {
      return (
        item.sectionMain === "Dispatch" &&
        item.dataList.filter((object) => {
          return object.batch.toLowerCase().startsWith(val.toLowerCase());
        }).length > 0
      );
    });

    setogData(dummy);
    setData(filterBySearch);
  }

  async function getDateData() {
    try {
      setError(0);
      setLoading2(1);

      const res = await apiConnector(`${DATA_URL}/DvN`, "PUT", info, {
        Authorization: `Bearer ${userinfo.token}`,
      });

      setData(res.data.data);
      setogData(res.data.data);
      setdummy(res.data.data);

      setLoading2(0);
    } catch (e) {
      setError(1);
      console.log(e);
      setLoading2(0);
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
                  Traceability & Search
                </span>
                <span className="text-zinc-500 text-xs font-mono">• Dispatch Ledger Query</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <PackageSearch className="w-7 h-7 text-primary" />
                Dispatch Batch Traceability
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Track batch code production, packaged pouch quantities, leakages, and carton carton box counts.
              </p>
            </div>

            {/* Quick Batch Search input */}
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <Input
                type="text"
                placeholder="Quick batch code search..."
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-[#0d0d0d]/80 border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400 uppercase">Buyer:</span>
              <select
                className="px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-primary"
                onChange={(e) => {
                  setInfo((prevData) => ({
                    ...prevData,
                    buyer: e.target.value,
                    product: "",
                  }));
                  let p = products.filter((item) => item.buyer === e.target.value);
                  setproducts2(p);
                }}
              >
                <option value="">All Buyers</option>
                {categories.map((val, index) => (
                  <option key={index} value={val.name}>
                    {val.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400 uppercase">Product:</span>
              <select
                name="product"
                className="px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-primary"
                onClick={(e) => inputHandler(e)}
              >
                <option value="">All Products</option>
                {products2
                  ?.filter((product) => product.buyer === info.buyer)
                  .map((val, index) => (
                    <option value={val.name} key={index}>
                      {val.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
              <span className="text-xs text-zinc-400 font-mono uppercase">From:</span>
              <Input
                type="date"
                name="start"
                onChange={(e) => inputHandler(e)}
                className="bg-transparent border-0 text-white text-xs font-mono focus:outline-none cursor-pointer h-7 p-0"
              />
            </div>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
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
              onClick={getDateData}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-primary/20 transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter Batches
            </button>
          </div>

          {error ? (
            <div className="py-24 text-center">
              <p className="text-2xl font-bold text-zinc-400">No Data Entry Found</p>
              <p className="text-xs text-zinc-600 mt-2">No batch logs found matching filter criteria.</p>
            </div>
          ) : (
            <div>
              {loading2 ? (
                <Loader />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 overflow-hidden shadow-2xl backdrop-blur-xl">
                  <div className="overflow-x-auto max-h-[44rem]">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-[#141414] border-b border-white/10 shadow-lg">
                        <TableRow className="bg-[#141414] hover:bg-[#141414] border-b border-white/10">
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Date</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Shift</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Buyer Name</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Product Name</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Batch Code</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pack Size</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Packed</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Leaked</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Carton Box</TableHead>
                        </TableRow>
                      </TableHeader>

                      {data.length ? (
                        <TableBody>
                          {data
                            .filter((obj) => obj.sectionMain === "Dispatch")
                            .map((val) =>
                              val.dataList
                                .filter((object) => {
                                  const matchesSearch = object.batch.toLowerCase().startsWith(search.toLowerCase());
                                  if (info.product) {
                                    return matchesSearch && object.productName === info.product;
                                  } else if (info.buyer) {
                                    return matchesSearch && object.buyerName === info.buyer;
                                  }
                                  return matchesSearch;
                                })
                                .map((row, i) => (
                                  <TableRow key={i} className="hover:bg-white/[0.03] border-b border-white/5 transition-colors">
                                    <TableCell className="font-mono text-xs text-zinc-400 py-3">
                                      {val.createdAt?.substring(5, 10).split("-").reverse().join("-")}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono py-3">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[12px] font-semibold ${
                                          val.dayTime === "Day"
                                            ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                                            : "bg-indigo-400/10 text-indigo-400 border border-indigo-400/20"
                                        }`}
                                      >
                                        {val.dayTime}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-zinc-300 text-xs py-3">{row.buyerName}</TableCell>
                                    <TableCell className="text-white font-semibold text-xs py-3">{row.productName}</TableCell>
                                    <TableCell className="font-mono text-xs text-primary font-bold py-3">{row.batch}</TableCell>
                                    <TableCell className="font-mono text-xs text-zinc-300 py-3">{row.packSize} kg</TableCell>
                                    <TableCell className="font-mono text-xs text-emerald-400 font-bold py-3">{row.pouchPacked}</TableCell>
                                    <TableCell className="font-mono text-xs text-rose-400 py-3">{row.leaked}</TableCell>
                                    <TableCell className="font-mono text-xs text-cyan-400 py-3">{row.box}</TableCell>
                                  </TableRow>
                                ))
                            )}

                          {/* Summary Total Row */}
                          <TableRow className="bg-primary/10 font-bold border-t-2 border-primary/40">
                            <TableCell colSpan={5} className="font-mono text-xs text-primary uppercase tracking-wider py-4">
                              Filtered Total:
                            </TableCell>
                            <TableCell className="font-mono text-xs text-zinc-500 py-4">—</TableCell>
                            <TableCell className="font-mono text-xs text-emerald-400 py-4">
                              {data
                                .filter((obj) => obj.sectionMain === "Dispatch")
                                .reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList
                                      .filter((object) => {
                                        const matchesSearch = object.batch.toLowerCase().startsWith(search.toLowerCase());
                                        if (info.product) {
                                          return matchesSearch && object.productName === info.product;
                                        } else if (info.buyer) {
                                          return matchesSearch && object.buyerName === info.buyer;
                                        }
                                        return matchesSearch;
                                      })
                                      .reduce((accumulator, object) => accumulator + (object.pouchPacked || 0), 0),
                                  0
                                )}
                            </TableCell>

                            <TableCell className="font-mono text-xs text-rose-400 py-4">
                              {data
                                .filter((obj) => obj.sectionMain === "Dispatch")
                                .reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList
                                      .filter((object) => {
                                        const matchesSearch = object.batch.toLowerCase().startsWith(search.toLowerCase());
                                        if (info.product) {
                                          return matchesSearch && object.productName === info.product;
                                        } else if (info.buyer) {
                                          return matchesSearch && object.buyerName === info.buyer;
                                        }
                                        return matchesSearch;
                                      })
                                      .reduce((accumulator, object) => accumulator + (object.leaked || 0), 0),
                                  0
                                )}
                            </TableCell>

                            <TableCell className="font-mono text-xs text-cyan-400 py-4">
                              {data
                                .filter((obj) => obj.sectionMain === "Dispatch")
                                .reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList
                                      .filter((object) => {
                                        const matchesSearch = object.batch.toLowerCase().startsWith(search.toLowerCase());
                                        if (info.product) {
                                          return matchesSearch && object.productName === info.product;
                                        } else if (info.buyer) {
                                          return matchesSearch && object.buyerName === info.buyer;
                                        }
                                        return matchesSearch;
                                      })
                                      .reduce((accumulator, object) => accumulator + (object.box || 0), 0),
                                  0
                                )}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      ) : (
                        <TableBody>
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-12 text-zinc-500 font-mono text-xs">
                              No dispatch entries match query filters
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

export default Left;
