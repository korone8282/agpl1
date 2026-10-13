import React, { useState, useEffect } from 'react';
import Loader from '../../components/Loader';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { CATEGORIES_URL, DATA_URL, PRODUCT_URL } from '../../redux/Utils/constants';
import { Input } from "../../components/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import { Layers, Search } from "lucide-react";
import PageTransition from '../PageTransition';

const BuyerProducts = () => {
  const [sectionData, setSectionData] = useState([]);
  const [loading, setLoading] = useState(1);
  const [products, setproducts] = useState([]);
  const [error, setError] = useState(0);
  const [categories, setcategories] = useState([]);
  const [info, setInfo] = useState({
    start: "",
    end: "",
    buyer: "",
  });

  const { userinfo } = useSelector((state) => state.auth);

  async function getData() {
    try {
      setError(0);
      setLoading(1);

      const res = await apiConnector(`${DATA_URL}/List`, "PUT", info, {
        Authorization: `Bearer ${userinfo.token}`,
      });

      setSectionData(
        res.data.data.map((e) => e.dataList.filter((buyer) => buyer.buyerName === info.buyer))
      );

      setLoading(0);
    } catch (e) {
      setError(1);
      console.log(e);
      setLoading(0);
    }
  }

  useEffect(() => {
    async function getCategories() {
      try {
        const res = await apiConnector(`${CATEGORIES_URL}/categories`, "GET");
        setcategories(res.data.data);
        setLoading(0);
      } catch (e) {
        console.log(e);
      }
    }

    async function getProducts() {
      try {
        const res = await apiConnector(`${PRODUCT_URL}/products`, "GET");
        setproducts(res.data.data);
        setLoading(0);
      } catch (error) {
        console.log(error);
      }
    }

    getProducts();
    getCategories();
  }, []);

  const inputHandler = async (e) => {
    setInfo((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }));
  };

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
                <span className="text-zinc-500 text-xs font-mono">• Buyer Portfolio Analysis</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <Layers className="w-7 h-7 text-primary" />
                Buyer Product Performance
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Filter production volume, pouch counts, wastage, and carton totals by client and date range.
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl">
                <span className="text-xs text-zinc-400 font-mono uppercase">Buyer:</span>
                <select
                  name="buyer"
                  className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
                  onChange={(e) => inputHandler(e)}
                  value={info.buyer}
                >
                  <option value="" className="bg-zinc-900 text-zinc-400">Select Buyer</option>
                  {categories
                    .slice()
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map((val, index) => (
                    <option className="bg-zinc-900 text-white" value={val.name} key={index}>
                      {val.name}
                    </option>
                  ))}
                </select>
              </div>

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
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-primary/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5" />
                Query Performance
              </button>
            </div>
          </div>

          {error ? (
            <div className="py-24 text-center">
              <p className="text-2xl font-bold text-zinc-400">No Data Entry Found</p>
              <p className="text-xs text-zinc-600 mt-2">No production records found for the selected buyer and date filter.</p>
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
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Product Name</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Batches</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Production (Kg)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Filled</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Packed</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Wastage (Total)</TableHead>
                          <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Carton Boxes</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {products
                          .filter((product) => product.buyer === info.buyer)
                          .slice()
                          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                          .map((element, index) => (
                            <TableRow key={index} className="hover:bg-white/[0.03] border-b border-white/5 transition-colors">
                              <TableCell className="font-mono text-xs text-zinc-500 py-3">{index + 1}</TableCell>
                              <TableCell className="text-white font-semibold text-xs py-3">{element.name}</TableCell>
                              <TableCell className="font-mono text-xs text-zinc-200 py-3">
                                {sectionData.reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj
                                      .filter((item) => item.productName === element.name)
                                      .reduce((accumulator, object) => accumulator + object.batchQuantity, 0),
                                  0
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-zinc-300 py-3">
                                {sectionData
                                  .reduce(
                                    (acc, obj) =>
                                      acc +
                                      obj
                                        .filter((item) => item.productName === element.name)
                                        .reduce((accumulator, obj) => accumulator + obj.yield * obj.batchQuantity, 0),
                                    0
                                  )
                                  .toFixed(2)}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-emerald-400 font-bold py-3">
                                {sectionData.reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj
                                      .filter((item) => item.productName === element.name)
                                      .reduce((accumulator, obj) => accumulator + obj.pouchQuantity, 0),
                                  0
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-cyan-400 font-bold py-3">
                                {sectionData.reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj
                                      .filter((item) => item.productName === element.name)
                                      .reduce((accumulator, obj) => accumulator + obj.pouchPacked, 0),
                                  0
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-rose-400 py-3">
                                {sectionData.reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj
                                      .filter((item) => item.productName === element.name)
                                      .reduce((accumulator, obj) => accumulator + obj.empty, 0),
                                  0
                                ) +
                                  sectionData.reduce(
                                    (acc, obj) =>
                                      acc +
                                      obj
                                        .filter((item) => item.productName === element.name)
                                        .reduce((accumulator, obj) => accumulator + obj.leaked, 0),
                                    0
                                  ) +
                                  sectionData.reduce(
                                    (acc, obj) =>
                                      acc +
                                      obj
                                        .filter((item) => item.productName === element.name)
                                        .reduce((accumulator, obj) => accumulator + obj.foreignMatter, 0),
                                    0
                                  )}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-zinc-200 py-3">
                                {sectionData.reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj
                                      .filter((item) => item.productName === element.name)
                                      .reduce((accumulator, obj) => accumulator + obj.box, 0),
                                  0
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
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
};

export default BuyerProducts;
