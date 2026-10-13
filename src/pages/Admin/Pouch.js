import React, {useState, useEffect} from 'react'
import Loader from '../../components/Loader';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { PRODUCT_URL,CATEGORIES_URL  } from '../../redux/Utils/constants';
import { DATA_URL } from '../../redux/Utils/constants';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import {toast} from 'react-toastify';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/Popover";
import { Button } from "../../components/Buttons";
import { Input } from "../../components/Input";
import PageTransition from '../PageTransition';

const currentMonth = new Date().getMonth() + 1;

const Pouch = () => {

  const [sectionData, setSectionData] = useState([]);
  const [loading, setLoading] = useState(1);
  const [modalMode, setModalMode] = useState(null); // 'update' | 'add' | null
  const [products, setproducts] = useState([]);
  const [error, setError] = useState(0);
  const [id, setId] = useState("");
  const [month, setmonth] = useState(currentMonth);
  const [expandedId, setExpandedId] = useState(null);
  const [actionOpenId, setActionOpenId] = useState(null);
  const [sortDesc, setSortDesc] = useState(false);
  const [categories, setcategories] = useState([]);
  const [info, setInfo] = useState({
      buyer:"",
      pouches:"",
      date:"",
      month: currentMonth,
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

  async function getProducts(){
    try {
      const res = await apiConnector(`${PRODUCT_URL}/products`,"GET");
      setproducts(res.data.data);
    } catch (error) {
      console.log(error);
    }
  }

  function openModal(mode, element) {
    setModalMode(mode);
    setId(element._id);
    setInfo((prevData) => ({
      ...prevData,
      product: element.name,
      pouches: mode === "update" ? String(element.pouches?.[month - 1]?.stock ?? "") : "",
      date: "",
      month,
    }));
    setActionOpenId(null);
  }

  async function handleSubmit(){
    try {
      if (!info.pouches && info.pouches !== 0) {
        toast("Enter pouch count");
        return;
      }
      if (modalMode === "add" && !info.date) {
        toast("Enter date");
        return;
      }

      await apiConnector(
        `${PRODUCT_URL}/updatePouch/${id}`,
        "PUT",
        { ...info, mode: modalMode },
        { Authorization: `Bearer ${userinfo.token}` }
      );
      setModalMode(null);
      toast(modalMode === "add" ? "Pouches added" : "Pouches (IN) updated");
      await getProducts();
    } catch (error) {
      toast(error.response?.data?.message || "Request failed")
    }
  }

  useEffect(() => {

    async function getCategories(){
        try {
      const res = await apiConnector(`${CATEGORIES_URL}/categories`,"GET");
      setcategories(res.data.data);
        } catch (e) {
          console.log(e)
        }
        }

      async function getData(){
      try {
      setError(0);
      setLoading(1);
      setExpandedId(null);

      const res = await apiConnector(`${DATA_URL}/List/${month}`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});

       setSectionData(
         (res.data.data || []).map((doc) => ({
           ...doc,
           dataList: (doc.dataList || []).filter((item) => item.buyerName === info.buyer),
         }))
       );

       setTimeout(()=>setLoading(0),100);

      } catch (e) {
        setSectionData([]);
        setLoading(0);
        if (e?.response?.status !== 404) {
          setError(1);
          console.log(e);
        }
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

  const getPrevBalance = (element) =>
    month <= 1 ? 0 : (Number(element.pouches?.[month - 2]?.remain) || 0);

  const getStockIn = (element) =>
    Number(element.pouches?.[month - 1]?.stock) || 0;

  const getStockEntries = (element) =>
    element.pouches?.[month - 1]?.entries || [];

  const toDateKey = (value) => {
    if (!value) return "";
    if (typeof value === "string" && value.length >= 10) return value.substring(0, 10);
    return new Date(value).toISOString().substring(0, 10);
  };

  const getProductItems = (productName) =>
    sectionData
      .filter((doc) => doc.sectionMain === "Filling")
      .flatMap((doc) =>
        (doc.dataList || [])
          .filter((item) => item.productName === productName)
          .map((item) => ({ ...item, createdAt: doc.createdAt }))
      );

  const getFilled = (productName) =>
    getProductItems(productName).reduce((acc, item) => acc + (Number(item.pouchQuantity) || 0), 0);

  const getWaste = (productName) =>
    getProductItems(productName).reduce((acc, item) => acc + (Number(item.empty) || 0), 0);

  const formatDateLabel = (dateKey) => {
    const [, m, d] = dateKey.split("-");
    return `${d}-${m}`;
  };

  // Merge filling + dated stock adds; highlight stock-in dates
  const getDateEntries = (element) => {
    const byDate = {};

    const ensure = (dateKey) => {
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          dateKey,
          stockIn: 0,
          filled: 0,
          waste: 0,
          hasStockIn: false,
          balance: 0,
        };
      }
      return byDate[dateKey];
    };

    sectionData
      .filter((doc) => doc.sectionMain === "Filling")
      .forEach((doc) => {
        const dateKey = toDateKey(doc.createdAt);
        const items = (doc.dataList || []).filter(
          (item) => item.productName === element.name
        );
        if (!items.length) return;

        const row = ensure(dateKey);
        items.forEach((item) => {
          row.filled += Number(item.pouchQuantity) || 0;
          row.waste += Number(item.empty) || 0;
        });
      });

    const stockEntries = getStockEntries(element);
    stockEntries.forEach((entry) => {
      const dateKey = toDateKey(entry.date);
      if (!dateKey) return;
      const row = ensure(dateKey);
      row.stockIn += Number(entry.quantity) || 0;
      row.hasStockIn = true;
    });

    const datedStock = stockEntries.reduce(
      (acc, entry) => acc + (Number(entry.quantity) || 0),
      0
    );
    const undatedStock = Math.max(0, getStockIn(element) - datedStock);

    if (Object.keys(byDate).length === 0 && (getStockIn(element) > 0 || getPrevBalance(element) > 0)) {
      const year = new Date().getFullYear();
      const monthStr = String(month).padStart(2, "0");
      ensure(`${year}-${monthStr}-01`);
    }

    const ascending = Object.values(byDate).sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey)
    );

    // Any monthly Pouches (IN) entered without a specific day belongs to the opening entry of the month
    if (undatedStock > 0 && ascending.length > 0) {
      ascending[0].stockIn += undatedStock;
      ascending[0].hasStockIn = true;
    }

    // Total balance of day X = Balance of day X - 1 (Day 1 total balance = previous month's ending balance)
    let running = getPrevBalance(element);
    ascending.forEach((day) => {
      day.totalBalance = running;
      running = day.totalBalance + day.stockIn - day.filled - day.waste;
      day.balance = running;
    });

    return sortDesc ? ascending.slice().reverse() : ascending;
  };

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full space-y-6 text-start">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  Inventory Ledger
                </span>
                <span className="text-zinc-500 text-xs font-mono">• Finished Goods & Packaging</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Pouch Stock Reconciliation: <span className="text-primary">{months[month - 1].month}</span>
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Real-time tracking of inward supply, filling consumption, wastage loss, and closing balance.
              </p>
            </div>

            {/* Controls */}
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
                  {categories
                    .slice()
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map((val, index) => (
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
            </div>
          </div>

          {error ? (
            <div className="w-full p-16 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
              <p className="text-xl font-bold text-zinc-400">No Data Entry Found</p>
              <p className="text-xs text-zinc-500 mt-1">Please select a valid buyer or verify entry logs.</p>
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
                      <TableHead className="bg-[#141414] text-primary text-xs font-mono py-3.5">Pouches (IN)</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Filled</TableHead>
                      <TableHead className="bg-[#141414] text-amber-400 text-xs font-mono py-3.5">Waste Pouches</TableHead>
                      <TableHead className="bg-[#141414] text-emerald-400 text-xs font-mono py-3.5">Current Balance</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {products
                      .filter((product) => product.buyer === info.buyer)
                      .slice()
                      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                      .map((element, i) => {
                      const isExpanded = expandedId === element._id;
                      const dateEntries = isExpanded ? getDateEntries(element) : [];
                      const prevBalance = getPrevBalance(element);
                      const stockIn = getStockIn(element);
                      const filled = getFilled(element.name);
                      const waste = getWaste(element.name);
                      const currentBalance = prevBalance + stockIn - filled - waste;

                      return (
                        <React.Fragment key={element._id || i}>
                          <TableRow
                            className="hover:bg-white/[0.03] border-b border-white/5 cursor-pointer transition-colors"
                            onClick={() => {
                              setExpandedId(isExpanded ? null : element._id);
                            }}
                          >
                            <TableCell className="font-mono text-xs text-zinc-500 py-3.5">{i + 1}</TableCell>
                            <TableCell className="font-semibold text-white py-3.5 flex items-center gap-2">
                              <span>{element.name}</span>
                              <span className="text-[12px] text-zinc-500 font-mono">
                                {isExpanded ? "▲" : "▼"}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-zinc-400 py-3.5">{prevBalance}</TableCell>
                            <TableCell className="font-mono text-xs text-primary font-bold py-3.5">{stockIn}</TableCell>
                            <TableCell className="font-mono text-xs text-zinc-300 py-3.5">{filled}</TableCell>
                            <TableCell className="font-mono text-xs text-amber-400 py-3.5">{waste}</TableCell>
                            <TableCell className="font-mono text-xs text-emerald-400 font-bold py-3.5">{currentBalance}</TableCell>
                            <TableCell className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <Popover
                                open={actionOpenId === element._id}
                                onOpenChange={(open) => setActionOpenId(open ? element._id : null)}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="border border-white/10 bg-white/5 hover:bg-primary hover:text-black text-zinc-300 text-xs px-3 py-1 rounded-lg h-7 font-semibold transition-all"
                                  >
                                    Manage
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-44 p-2 bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl text-white" align="end">
                                  <div className="flex flex-col gap-1.5 p-1">
                                    <Button
                                      variant="ghost"
                                      className="w-full text-center justify-center text-xs py-2.5 px-3 hover:bg-white/10 hover:text-primary rounded-xl font-medium transition-all"
                                      onClick={() => openModal("update", element)}
                                    >
                                      Update Stock (IN)
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="w-full text-center justify-center text-xs py-2.5 px-3 hover:bg-white/10 hover:text-primary rounded-xl font-medium transition-all"
                                      onClick={() => openModal("add", element)}
                                    >
                                      Add New Pouches
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow className="bg-black/70 hover:bg-black/70 border-b border-white/10">
                              <TableCell colSpan={8} className="p-0">
                                <div className="px-6 py-4 bg-[#0a0a0a] border-l-2 border-primary">
                                  <div className="text-xs font-mono text-zinc-400 mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-white">Date Breakdown</span>
                                      <span className="text-zinc-600">•</span>
                                      <span className="text-[11px] text-zinc-400 font-normal">
                                        Total Balance (Day X) = Balance (Day X-1)
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span>Monthly Opening Stock (Prev + IN): <strong className="text-white">{prevBalance + stockIn}</strong></span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSortDesc(!sortDesc);
                                        }}
                                        className="px-2.5 py-1 rounded-lg border border-white/10 hover:border-primary/50 text-[11px] text-zinc-300 hover:text-white bg-white/5 transition-all"
                                      >
                                        {sortDesc ? "Newest First ▼" : "Day 1 → 31 ▲"}
                                      </button>
                                    </div>
                                  </div>
                                  {dateEntries.length === 0 ? (
                                    <div className="text-xs text-zinc-500 py-2">
                                      No shift entries recorded for this product in {months[month - 1].month}.
                                    </div>
                                  ) : (
                                    <div className="rounded-xl border border-white/10 overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-white/5 border-b border-white/10">
                                            <TableHead className="text-zinc-400 font-mono text-[13px] py-2">Date</TableHead>
                                            <TableHead className="text-zinc-300 font-mono text-[13px] py-2">Total Balance</TableHead>
                                            <TableHead className="text-primary font-mono text-[13px] py-2">Pouches (IN)</TableHead>
                                            <TableHead className="text-zinc-400 font-mono text-[13px] py-2">Pouch Filled</TableHead>
                                            <TableHead className="text-amber-400 font-mono text-[13px] py-2">Waste Pouches</TableHead>
                                            <TableHead className="text-emerald-400 font-mono text-[13px] py-2">Balance</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {dateEntries.map((day) => (
                                            <TableRow
                                              key={day.dateKey}
                                              className={day.hasStockIn ? "bg-primary/10 hover:bg-primary/15" : "border-b border-white/5 hover:bg-white/[0.02]"}
                                            >
                                              <TableCell className="font-mono text-xs py-2">{formatDateLabel(day.dateKey)}</TableCell>
                                              <TableCell className="font-mono text-xs py-2 text-zinc-300 font-semibold">{day.totalBalance}</TableCell>
                                              <TableCell className="font-mono text-xs py-2 font-semibold text-primary">{day.stockIn || "—"}</TableCell>
                                              <TableCell className="font-mono text-xs py-2">{day.filled || "—"}</TableCell>
                                              <TableCell className="font-mono text-xs py-2 text-amber-400">{day.waste || "—"}</TableCell>
                                              <TableCell className="font-mono text-xs py-2 text-emerald-400 font-bold">{day.balance}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Modal */}
          {modalMode && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="text-start">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {modalMode === "add" ? "Add Stock Pouches" : "Update Opening Stock (IN)"}
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 font-mono">
                      {info.product} • {months[month - 1]?.month}
                    </p>
                  </div>
                  <button
                    onClick={() => setModalMode(null)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-start">
                  <div>
                    <label htmlFor="pouchCount" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      Pouch Count (Units)
                    </label>
                    <Input
                      type="number"
                      id="pouchCount"
                      name="pouches"
                      placeholder="e.g. 5000"
                      value={info.pouches}
                      onChange={(e) => inputHandler(e)}
                      className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primary text-sm font-mono transition-all"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1.5 font-mono">
                      {modalMode === "add" ? "Will be logged with supply date in shift breakdown." : "Sets the total monthly opening pouches."}
                    </p>
                  </div>

                  {modalMode === "add" && (
                    <div>
                      <label htmlFor="pouchDate" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                        Supply Date
                      </label>
                      <Input
                        type="date"
                        id="pouchDate"
                        name="date"
                        value={info.date}
                        onChange={(e) => inputHandler(e)}
                        className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white focus:outline-none focus:border-primary text-sm font-mono transition-all"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all"
                    onClick={() => setModalMode(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    {modalMode === "add" ? "Add Stock" : "Save Changes"}
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

export default Pouch
