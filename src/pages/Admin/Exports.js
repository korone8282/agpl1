import React, { useState, useEffect } from 'react';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { toast } from 'react-toastify';
import { CATEGORIES_URL, PRODUCT_URL, EXPORT_URL } from '../../redux/Utils/constants';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import Loader from '../../components/Loader';
import { CheckCheck, Trash2, CirclePlus, Box } from "lucide-react";
import { Input } from "../../components/Input";
import { useSelector } from 'react-redux';
import PageTransition from '../PageTransition';

const Exports = () => {
  const [products, setproducts] = useState([]);
  const [categories, setcategories] = useState([]);
  const [loading, setLoading] = useState(1);
  const [info, setInfo] = useState({
    buyerName: "",
    productName: "",
    pouch: "",
    packSize: "",
  });
  const [name, setName] = useState("C1");
  const [arr, setArr] = useState([]);

  const { userinfo } = useSelector((state) => state.auth);

  useEffect(() => {
    async function getCategories() {
      try {
        const res = await apiConnector(`${CATEGORIES_URL}/categories`, "GET");
        setcategories(res.data.data);
        setLoading(0);
      } catch (error) {
        console.log(error);
      }
    }

    async function getProducts() {
      try {
        const res = await apiConnector(`${PRODUCT_URL}/products`, "GET");
        setproducts(res.data.data);
      } catch (error) {
        console.log(error);
      }
    }

    getCategories();
    getProducts();
  }, []);

  const inputHandler = async (e) => {
    setInfo((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }));
  };

  const submitHandler = async () => {
    if (!name.trim()) {
      toast("Please enter container name");
      return;
    }
    if (arr.length === 0) {
      toast("Please add at least one SKU to the manifest");
      return;
    }

    const toastId = toast.loading("Loading...", {
      position: 'top-center',
    });

    try {
      await apiConnector(`${EXPORT_URL}/${name}`, "POST", arr, {
        Authorization: `Bearer ${userinfo.token}`,
      });

      toast.dismiss(toastId);
      toast("Successfully Submited");

      window.location.reload();
    } catch (error) {
      toast.dismiss(toastId);
      toast(error?.response?.data?.message || "Error submitting export");
    }
  };

  const rowDataHandler = () => {
    if (!info.buyerName || !info.productName) {
      toast("Please select both buyer and product");
      return;
    }
    setArr((prev) => [...prev, { ...info }]);

    setInfo({
      buyerName: "",
      productName: "",
      pouch: "",
      packSize: "",
    });
  };

  const deleteHandler = (i) => {
    setArr((prev) => prev.filter((_, index) => index !== i));
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
                  Export Operations
                </span>
                <span className="text-zinc-500 text-xs font-mono">• Manifest Builder</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <Box className="w-7 h-7 text-primary" />
                Create Export Container
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Configure container identifier and allocate SKU quotas for export order fulfillment.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl">
                <span className="text-xs text-zinc-400 font-mono uppercase">Container ID:</span>
                <input
                  type="text"
                  value={name}
                  placeholder="e.g. C1, EXP-2026-01"
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent border-0 text-white text-xs font-mono focus:outline-none w-32"
                />
              </div>

              <button
                type="button"
                onClick={submitHandler}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-primary/20 transition-all cursor-pointer"
              >
                Save & Initialize Container
              </button>
            </div>
          </div>

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
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Size (Kg)</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Required Pouches</TableHead>
                      <TableHead className="bg-[#141414] text-center text-xs font-mono py-3.5">Status</TableHead>
                      <TableHead className="bg-[#141414] text-center text-xs font-mono py-3.5">Remove</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {arr?.map((row, i) => (
                      <TableRow key={i} className="hover:bg-white/[0.03] border-b border-white/5 transition-colors">
                        <TableCell className="font-mono text-xs text-zinc-500 py-3">{i + 1}</TableCell>
                        <TableCell className="text-zinc-300 text-xs py-3">{row.buyerName}</TableCell>
                        <TableCell className="text-white font-semibold text-xs py-3">{row.productName}</TableCell>
                        <TableCell className="font-mono text-xs text-zinc-300 py-3">{row.packSize}</TableCell>
                        <TableCell className="font-mono text-xs text-emerald-400 font-bold py-3">{row.pouch}</TableCell>
                        <TableCell className="py-3 text-center">
                          <CheckCheck className="h-5 w-5 mx-auto text-emerald-400" />
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <Trash2
                            className="h-4 w-4 mx-auto text-rose-400 hover:text-rose-300 cursor-pointer transition-colors"
                            onClick={() => deleteHandler(i)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Add Row Form Inputs */}
                    <TableRow className="bg-white/[0.02] border-t-2 border-primary/30">
                      <TableCell className="py-3">
                        <CirclePlus className="h-5 w-5 text-primary" />
                      </TableCell>

                      <TableCell className="py-3">
                        <select
                          className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-primary"
                          name="buyerName"
                          value={info.buyerName}
                          onChange={(e) => inputHandler(e)}
                        >
                          <option value="">Select Buyer</option>
                          {categories.map((val, index) => (
                            <option value={`${val.name}`} key={index}>
                              {val.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>

                      <TableCell className="py-3">
                        <select
                          name="productName"
                          className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-primary"
                          value={info.productName}
                          onChange={(e) => inputHandler(e)}
                        >
                          <option value="">Select Product</option>
                          {products
                            ?.filter((product) => product.buyer === info.buyerName)
                            .map((val, index) => (
                              <option value={val.name} key={index}>
                                {val.name}
                              </option>
                            ))}
                        </select>
                      </TableCell>

                      <TableCell className="py-3">
                        <Input
                          type="number"
                          placeholder="Pack Size"
                          name="packSize"
                          value={info.packSize}
                          onChange={(e) => inputHandler(e)}
                          className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs font-mono focus:border-primary"
                        />
                      </TableCell>

                      <TableCell className="py-3">
                        <Input
                          type="number"
                          placeholder="Target Pouches"
                          name="pouch"
                          value={info.pouch}
                          onChange={(e) => inputHandler(e)}
                          className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs font-mono focus:border-primary"
                        />
                      </TableCell>

                      <TableCell className="py-3 text-center">
                        <button
                          type="button"
                          onClick={rowDataHandler}
                          className="px-3 py-1.5 bg-primary hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm"
                          title="Append SKU quota"
                        >
                          + Add
                        </button>
                      </TableCell>

                      <TableCell className="py-3 text-center text-xs text-zinc-600 font-mono">—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Exports;
