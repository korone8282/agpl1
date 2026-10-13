import React, {useState, useEffect} from 'react'
import Loader from '../../components/Loader';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { PRODUCT_URL,CATEGORIES_URL  } from '../../redux/Utils/constants';
import { DATA_URL } from '../../redux/Utils/constants';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import { Link } from 'react-router-dom';
import {toast} from 'react-toastify';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/Popover";
import { Button } from "../../components/Buttons";
import { Input } from "../../components/Input";
import PageTransition from '../PageTransition';

const Dispatched = () => {


    const [sectionData, setSectionData] = useState([]);
    const [loading, setLoading] = useState(1);
    const [openBox2, setopenBox2] = useState(0);
    const [products, setproducts] = useState([]);
    const [error, setError] = useState(0);
    const [id, setId] = useState("");
    const [month, setmonth] = useState(1);
    const [categories, setcategories] = useState([]);
    const [info, setInfo] = useState({
        buyer:"",
        box:"",
        dispatched:"",
        issue:"",
        month:"",
        product:""
    });
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

    const {userinfo} = useSelector(state => state.auth);

    async function handleUpdate(){
      try {
    
        await apiConnector(`${PRODUCT_URL}/Update/${id}`,"PUT",info,{Authorization: `Bearer ${userinfo.token}`});
        setopenBox2(!openBox2);
        toast("Successfully Updated");
      } catch (error) {
        toast(error.response.data.message)
      }
    
    }
      
   
    useEffect(() => {

      async function getCategories(){
          try {
    
        const res = await apiConnector(`${CATEGORIES_URL}/categories`,"GET");
        const sortedCats = [...(res.data.data || [])].sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
        );
        setcategories(sortedCats);
    
          } catch (e) {
            console.log(e)
          }
          }

        async function getProducts(){
            try {
      
          const res = await apiConnector(`${PRODUCT_URL}/products`,"GET");
          const sortedProds = [...(res.data.data || [])].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
          );
          setproducts(sortedProds);
      
            } catch (error) {
              console.log(error);
            }
            }
        
        async function getData(){
        try {
        setError(0);
        setLoading(1);
        
        const res = await apiConnector(`${DATA_URL}/List/${month}`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});

         setSectionData(res.data.data.map(e=>e.dataList.filter( buyer => buyer.buyerName === info.buyer)));

         setTimeout(()=>setLoading(0),100);

        } catch (e) {
          setError(1);
          console.log(e);
        }
      }
        
        getData();
        getProducts();
        getCategories();

      }, [info.buyer,month,userinfo.token]);

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
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  Logistics & Outbound
                </span>
                <span className="text-zinc-500 text-xs font-mono">• Dispatch Ledger</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Dispatched Stock: <span className="text-primary">{months[month - 1].month}</span>
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Outbound deliveries, boxed goods reconciliation, and finished inventory remaining.
              </p>
            </div>

            {/* Controls & Report Link */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-mono uppercase text-zinc-400">Buyer:</label>
                <select
                  name="buyer"
                  className="px-4 py-2 bg-black border border-white/10 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-primary transition-all"
                  onChange={(e) => inputHandler(e)}
                  value={info.buyer}
                >
                  <option value="">Select Buyer</option>
                  {categories.map((val, index) => (
                    <option key={index} value={val.name}>
                      {val.name}
                    </option>
                  ))}
                </select>
              </div>

              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 text-white rounded-xl px-4 py-2 text-xs font-semibold tracking-wider transition-all"
                  >
                    📅 {months[month - 1].month}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-3 bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl text-white">
                  <div className="grid grid-cols-3 gap-1.5">
                    {months.map((monthItem, index) => (
                      <Button
                        key={monthItem.month}
                        variant="ghost"
                        className="text-xs hover:bg-white/10 hover:text-primary rounded-lg"
                        onClick={() => {
                          setmonth(index + 1);
                          setInfo((prevData) => ({
                            ...prevData,
                            month: index + 1,
                          }));
                          setIsOpen(false);
                        }}
                      >
                        {monthItem.month}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Link to="Dispatch-Report">
                <button className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary hover:text-black text-primary border border-primary/30 text-xs font-bold transition-all shadow-sm">
                  📊 View Dispatch Report
                </button>
              </Link>
            </div>
          </div>

          {error ? (
            <div className="w-full p-16 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
              <p className="text-xl font-bold text-zinc-400">No Data Entry Found</p>
              <p className="text-xs text-zinc-500 mt-1">Please select a valid buyer or check data logs.</p>
            </div>
          ) : loading ? (
            <Loader />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto max-h-[44rem]">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-[#141414] border-b border-white/10 shadow-lg">
                    <TableRow className="bg-[#141414] hover:bg-[#141414] border-b border-white/10">
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">#</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Product Name</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Prev Balance</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Production (Kg)</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Filled</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Packed</TableHead>
                      <TableHead className="bg-[#141414] text-primary text-xs font-mono py-3.5">Dispatched</TableHead>
                      <TableHead className="bg-[#141414] text-amber-400 text-xs font-mono py-3.5">Difference</TableHead>
                      <TableHead className="bg-[#141414] text-emerald-400 text-xs font-mono py-3.5">Current Balance</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {products
                      .filter((product) => product.buyer === info.buyer)
                      .map((element, i) => (
                        <TableRow
                          key={i}
                          className="hover:bg-white/[0.04] border-b border-white/5 cursor-pointer transition-colors"
                          onClick={() => {
                            setopenBox2(!openBox2);
                            setId(element._id);
                            setInfo((prevData) => ({
                              ...prevData,
                              product: element.name,
                            }));
                          }}
                        >
                          <TableCell className="font-mono text-xs text-zinc-500 py-3.5">{i + 1}</TableCell>
                          <TableCell className="font-semibold text-white py-3.5">{element.name}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-400 py-3.5">
                            {element.dispatched
                              .filter((item) => item.month < month)
                              .reduce((accumulator, obj) => accumulator + obj.balance, 0)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-300 py-3.5">
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
                          <TableCell className="font-mono text-xs text-zinc-300 py-3.5">
                            {sectionData.reduce(
                              (acc, obj) =>
                                acc +
                                obj
                                  .filter((item) => item.productName === element.name)
                                  .reduce((accumulator, obj) => accumulator + obj.pouchQuantity, 0),
                              0
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-300 py-3.5">
                            {sectionData.reduce(
                              (acc, obj) =>
                                acc +
                                obj
                                  .filter((item) => item.productName === element.name)
                                  .reduce((accumulator, obj) => accumulator + obj.pouchPacked, 0),
                              0
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-primary font-bold py-3.5">
                            {element.dispatched[month - 1]?.dispatch}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-amber-400 py-3.5">
                            {sectionData.reduce(
                              (acc, obj) =>
                                acc +
                                obj
                                  .filter((item) => item.productName === element.name)
                                  .reduce((accumulator, obj) => accumulator + obj.pouchPacked, 0),
                              0
                            ) - (element.dispatched[month - 1]?.dispatch || 0)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-emerald-400 font-bold py-3.5">
                            {element.dispatched
                              .filter((item) => item.month <= month)
                              .reduce((accumulator, obj) => accumulator + obj.balance, 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Update Modal */}
          {openBox2 && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-base font-bold text-white">Record Dispatch: {info.product}</h3>
                  <button onClick={() => setopenBox2(0)} className="text-zinc-400 hover:text-white text-xs">
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="dispatched" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Pouches Dispatched
                    </label>
                    <Input
                      type="number"
                      id="confirmPassword"
                      name="dispatched"
                      placeholder="e.g. 2400"
                      onChange={(e) => inputHandler(e)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primary text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="box" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Boxes / Cartons
                    </label>
                    <Input
                      type="number"
                      id="confirmPassword"
                      name="box"
                      placeholder="e.g. 50"
                      onChange={(e) => inputHandler(e)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primary text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="Datex" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Issued On Date
                    </label>
                    <Input
                      type="date"
                      id="Datex"
                      name="issue"
                      onChange={(e) => inputHandler(e)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/10 text-white focus:outline-none focus:border-primary text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all"
                    onClick={() => setopenBox2(0)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={handleUpdate}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Save Dispatch
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Dispatched;
