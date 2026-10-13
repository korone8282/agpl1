import { Button } from "../../components/Buttons";
import { Input } from "../../components/Input";
import { Search, Filter } from "lucide-react";
import React, { useEffect, useState } from 'react'
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { PRODUCT_URL, CATEGORIES_URL,  DATA_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader'
import {toast} from 'react-toastify';
import PageTransition from '../PageTransition';

const Index = () => {

  const [arr, setarr] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(1);
  const [loading2, setLoading2] = useState(0);
  const [error, setError] = useState(0);
  const [products, setproducts] = useState([]);
  const [ogData, setogData] = useState([]);
  const [dummy, setdummy] = useState();
  const [openBox, setopenBox] = useState(0);
  const [categories, setcategories] = useState([]); 
  const [info, setInfo] = useState({
      start:"",
      end:"",
      product:""
  });

  const {userinfo} = useSelector(state=>state.auth);

  useEffect(() => {

      async function getProducts(){
          try {
    
        const res = await apiConnector(`${PRODUCT_URL}/products`,"GET");
        setproducts(res.data.data);
        setogData(res.data.data);
        setdummy(res.data.data);
    
        setLoading(0);
          } catch (error) {
            console.log(error);
          }
          }

  async function getCategories(){
          try {
        
        setError(0);
    
        const res = await apiConnector(`${CATEGORIES_URL}/categories`,"GET");
        setcategories(res.data.data);
    
        setLoading(0);
          } catch (error) {
            setError(1)
            console.log(error);
          }
          }
    
    getCategories();
    getProducts();

    }, [userinfo.token]);

    function handleSearch(val) {

      if (val === ""){ 
        setproducts(dummy)
        return
        }

       let filterBySearch = ogData.filter((item) => {
           if (item.name.toLowerCase().startsWith(val.toLowerCase())){ 
             return item
            } else {
             return null 
            }
       })
       setogData(dummy)
       setproducts(filterBySearch); 
     }

const inputHandler = async(e) =>{
   setInfo((prevData) => ({
     ...prevData,
     [e.target.name]: e.target.value
   }));
 }

async function getData(){

 setLoading2(1)

 let array = []
 for (let q = new Date(info.start); q <= new Date(info.end); q = new Date(q.getTime() + 86400000)) {
   array.push(q.toISOString());
 }
 setarr(array)

   try {

     const res = await apiConnector(`${DATA_URL}/Product`,"PUT",info,{Authorization: `Bearer ${userinfo.token}`});
     setData(res.data.data);
     setLoading2(0);

   } catch (error) {
     setLoading2(0);
     toast(error.response.data.message)
   }
 }

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
                  Select a product and date range to inspect cross-departmental throughput (Kitchen, Filling, Dispatch).
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
                        {products?.length || 0}
                      </span>
                    </h2>
                    <Button
                      variant="outline"
                      className="border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs px-3 py-1.5 rounded-xl h-8"
                      onClick={() => setopenBox(!openBox)}
                    >
                      <Filter className="w-3.5 h-3.5 mr-1.5" />
                      Buyer Filter
                    </Button>
                  </div>

                  {/* Filter Dropdown Popup */}
                  {openBox && (
                    <div className="absolute right-5 top-16 z-30 bg-[#141414] border border-white/15 rounded-xl p-2 shadow-2xl max-h-60 overflow-y-auto w-48 text-xs">
                      <div
                        className="p-2 hover:bg-white/10 rounded-lg cursor-pointer text-zinc-300 hover:text-white"
                        onClick={() => {
                          setproducts(dummy);
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
                            let p = (dummy || products).filter((item) => item.buyer === val.name);
                            setproducts(p);
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
                      placeholder="Search products by title..."
                      onChange={(e) => handleSearch(e.target.value)}
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
                        {products
                          .slice()
                          .sort((a, b) => {
                            const bC = (a.buyer || "").localeCompare(b.buyer || "");
                            if (bC !== 0) return bC;
                            return (a.name || "").localeCompare(b.name || "");
                          })
                          .map((val, i) => {
                          const isSelected = info.product?.name === val.name && info.product?.buyer === val.buyer;
                          return (
                            <tr
                              key={i}
                              onClick={() => {
                                setInfo((prevData) => ({
                                  ...prevData,
                                  product: val,
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
                            Selected: <strong>{info.product.name}</strong> ({info.product.buyer})
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
                          onChange={(e) => inputHandler(e)}
                          className="bg-transparent border-0 text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 bg-black border border-white/10 px-2.5 py-1.5 rounded-xl">
                        <span className="text-[12px] font-mono text-zinc-400 uppercase">To:</span>
                        <input
                          type="date"
                          name="end"
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
                        {arr?.map((val, i) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 px-3.5 text-zinc-400">{val?.substring(5, 10)}</td>
                            <td className="py-2.5 px-3.5 text-zinc-200">
                              {data
                                .filter((item) => item.createdAt === val)
                                .reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList
                                      .filter(
                                        (object) =>
                                          object.productName === info.product.name &&
                                          object.buyerName === info.product.buyer
                                      )
                                      .reduce((accumulator, obj) => accumulator + obj.yield * obj.batchQuantity, 0),
                                  0
                                )
                                .toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3.5 text-white font-semibold">
                              {data
                                .filter((item) => item.createdAt === val)
                                .reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList
                                      .filter(
                                        (object) =>
                                          object.productName === info.product.name &&
                                          object.buyerName === info.product.buyer
                                      )
                                      .reduce((accumulator, obj) => accumulator + obj.pouchQuantity, 0),
                                  0
                                )}
                            </td>
                            <td className="py-2.5 px-3.5 text-zinc-200">
                              {data
                                .filter((item) => item.createdAt === val)
                                .reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList
                                      .filter(
                                        (object) =>
                                          object.productName === info.product.name &&
                                          object.buyerName === info.product.buyer
                                      )
                                      .reduce((accumulator, obj) => accumulator + obj.pouchPacked, 0),
                                  0
                                )}
                            </td>
                            <td className="py-2.5 px-3.5 text-amber-400">
                              {data
                                .filter((item) => item.createdAt === val)
                                .reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList
                                      .filter(
                                        (object) =>
                                          object.productName === info.product.name &&
                                          object.buyerName === info.product.buyer
                                      )
                                      .reduce((accumulator, obj) => accumulator + obj.empty, 0),
                                  0
                                ) +
                                data
                                  .filter((item) => item.createdAt === val)
                                  .reduce(
                                    (acc, obj) =>
                                      acc +
                                      obj.dataList
                                        .filter(
                                          (object) =>
                                            object.productName === info.product.name &&
                                            object.buyerName === info.product.buyer
                                        )
                                        .reduce((accumulator, obj) => accumulator + obj.leaked, 0),
                                    0
                                  ) +
                                data
                                  .filter((item) => item.createdAt === val)
                                  .reduce(
                                    (acc, obj) =>
                                      acc +
                                      obj.dataList
                                        .filter(
                                          (object) =>
                                            object.productName === info.product.name &&
                                            object.buyerName === info.product.buyer
                                        )
                                        .reduce((accumulator, obj) => accumulator + obj.foreignMatter, 0),
                                    0
                                  )}
                            </td>
                            <td className="py-2.5 px-3.5 text-zinc-400">
                              {data
                                .filter((item) => item.createdAt === val)
                                .reduce(
                                  (acc, obj) =>
                                    acc +
                                    obj.dataList
                                      .filter(
                                        (object) =>
                                          object.productName === info.product.name &&
                                          object.buyerName === info.product.buyer
                                      )
                                      .reduce((accumulator, obj) => accumulator + obj.box, 0),
                                  0
                                )}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot className="bg-[#141414] font-mono text-xs font-bold border-t border-white/10 sticky bottom-0">
                        <tr>
                          <td className="py-3 px-3.5 text-primary uppercase">Total</td>
                          <td className="py-3 px-3.5 text-white">
                            {data
                              .reduce(
                                (acc, obj) =>
                                  acc +
                                  obj.dataList
                                    .filter(
                                      (object) =>
                                        object.productName === info.product.name &&
                                        object.buyerName === info.product.buyer
                                    )
                                    .reduce((accumulator, obj) => accumulator + obj.yield * obj.batchQuantity, 0),
                                0
                              )
                              .toFixed(2)}
                          </td>
                          <td className="py-3 px-3.5 text-primary">
                            {data.reduce(
                              (acc, obj) =>
                                acc +
                                obj.dataList
                                  .filter(
                                    (object) =>
                                      object.productName === info.product.name &&
                                      object.buyerName === info.product.buyer
                                  )
                                  .reduce((accumulator, obj) => accumulator + obj.pouchQuantity, 0),
                              0
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-white">
                            {data.reduce(
                              (acc, obj) =>
                                acc +
                                obj.dataList
                                  .filter(
                                    (object) =>
                                      object.productName === info.product.name &&
                                      object.buyerName === info.product.buyer
                                  )
                                  .reduce((accumulator, obj) => accumulator + obj.pouchPacked, 0),
                              0
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-amber-400">
                            {data.reduce(
                              (acc, obj) =>
                                acc +
                                obj.dataList
                                  .filter(
                                    (object) =>
                                      object.productName === info.product.name &&
                                      object.buyerName === info.product.buyer
                                  )
                                  .reduce((accumulator, obj) => accumulator + obj.empty, 0),
                              0
                            ) +
                              data.reduce(
                                (acc, obj) =>
                                  acc +
                                  obj.dataList
                                    .filter(
                                      (object) =>
                                        object.productName === info.product.name &&
                                        object.buyerName === info.product.buyer
                                    )
                                    .reduce((accumulator, obj) => accumulator + obj.leaked, 0),
                                0
                              ) +
                              data.reduce(
                                (acc, obj) =>
                                  acc +
                                  obj.dataList
                                    .filter(
                                      (object) =>
                                        object.productName === info.product.name &&
                                        object.buyerName === info.product.buyer
                                    )
                                    .reduce((accumulator, obj) => accumulator + obj.foreignMatter, 0),
                                0
                              )}
                          </td>
                          <td className="py-3 px-3.5 text-white">
                            {data.reduce(
                              (acc, obj) =>
                                acc +
                                obj.dataList
                                  .filter(
                                    (object) =>
                                      object.productName === info.product.name &&
                                      object.buyerName === info.product.buyer
                                  )
                                  .reduce((accumulator, obj) => accumulator + obj.box, 0),
                              0
                            )}
                          </td>
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