import React, { useState, useEffect, useMemo } from 'react'
import Loader from '../../components/Loader';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/Popover";
import { Button } from "../../components/Buttons";
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { DATA_URL } from '../../redux/Utils/constants';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import PageTransition from '../PageTransition';

function getPackSizeKg(val) {
  const n = Number(val) || 0;
  if (n <= 0) return 0.25;
  if (n > 5) return n / 1000;
  return n;
}
const ALL = "All";

const months = [
  { month: "January" },
  { month: "February" },
  { month: "March" },
  { month: "April" },
  { month: "May" },
  { month: "June" },
  { month: "July" },
  { month: "August" },
  { month: "September" },
  { month: "October" },
  { month: "November" },
  { month: "December" }
];

const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const num = (value) => Number(value) || 0;

const formatNum = (value, digits = 3) => num(value).toFixed(digits);

const formatInt = (value) => Math.round(num(value)).toString();

function getDateInfo(createdAt) {
  const key = new Date(createdAt).toISOString().substring(0, 10);
  const [, month, day] = key.split('-');
  return {
    dateKey: key,
    dateLabel: `${Number(day)} ${shortMonths[Number(month) - 1]}`,
  };
}

function normalizeShift(shift) {
  if (!shift) return "Day";
  const s = String(shift).trim().toLowerCase();
  if (s === "night") return "Night";
  if (s === "day") return "Day";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function shiftKey(dateKey, shift) {
  return `${dateKey}|||${shift}`;
}

function buildCostingRows(data) {
  const map = new Map();
  const shiftMeta = new Map();

  function getMeta(dateKey, shift) {
    const key = shiftKey(dateKey, shift);
    if (!shiftMeta.has(key)) {
      shiftMeta.set(key, {
        kitchenWorkers: null,
        fillingWorkers: null,
        dispatchWorkers: null,
        pouchesProduced: 0,
      });
    }
    return shiftMeta.get(key);
  }

  function getRow(dateKey, dateLabel, buyerName, productName, shift) {
    const key = `${dateKey}|||${buyerName}|||${productName}|||${shift}`;
    if (!map.has(key)) {
      map.set(key, {
        dateKey,
        dateLabel,
        buyerName,
        productName,
        shift,
        productionQty: 0,
        wastagePouches: 0,
        wastage: 0,
        pouchPacked: 0,
        pouchesProduced: 0,
        filledPouchWeightKg: 0,
      });
    }
    return map.get(key);
  }

  // Pass 1: Kitchen & Filling (Production only generates product rows on the left)
  data.forEach((doc) => {
    const list = doc.dataList || [];
    if (!list.length) return;
    const { dateKey, dateLabel } = getDateInfo(doc.createdAt);
    const shift = normalizeShift(doc.dayTime);
    const meta = getMeta(dateKey, shift);
    const first = list[0];
    const section = doc.sectionMain;

    if (section === 'Kitchen') {
      if (meta.kitchenWorkers === null) {
        meta.kitchenWorkers = num(first.workersQuantity);
      }
      list.forEach(item => {
        const row = getRow(dateKey, dateLabel, item.buyerName, item.productName, shift);
        row.productionQty += num(item.yield) * num(item.batchQuantity);
      });
    } else if (section === 'Filling') {
      if (meta.fillingWorkers === null) {
        meta.fillingWorkers = num(first.workersQuantity);
      }
      list.forEach(item => {
        const row = getRow(dateKey, dateLabel, item.buyerName, item.productName, shift);
        const pouches = num(item.pouchQuantity);
        const packSize = getPackSizeKg(item.packSize);
        row.pouchesProduced += pouches;
        meta.pouchesProduced += pouches;
        row.wastagePouches += num(item.empty);
        row.wastage += num(item.filled);
        row.filledPouchWeightKg += pouches * (packSize + 0.005);
      });
    }
  });

  // Pass 2: Dispatch (Only dispatch workers and packed quantities for existing production products)
  data.forEach((doc) => {
    const list = doc.dataList || [];
    if (!list.length) return;
    const { dateKey } = getDateInfo(doc.createdAt);
    const shift = normalizeShift(doc.dayTime);
    const meta = getMeta(dateKey, shift);
    const first = list[0];
    const section = doc.sectionMain;

    if (section === 'Dispatch') {
      if (meta.dispatchWorkers === null) {
        meta.dispatchWorkers = num(first.workersQuantity);
      }
      list.forEach(item => {
        const key = `${dateKey}|||${item.buyerName}|||${item.productName}|||${shift}`;
        if (map.has(key)) {
          const row = map.get(key);
          row.pouchPacked += num(item.pouchPacked);
        }
      });
    }
  });

  return Array.from(map.values())
    .map((row) => {
      const meta = getMeta(row.dateKey, row.shift);
      const fillingWorkers = meta.fillingWorkers ?? 0;
      const kitchenWorkers = meta.kitchenWorkers ?? 0;
      const dispatchWorkers = meta.dispatchWorkers ?? 0;
      const fillingCost = fillingWorkers * 900;
      const kitchenCost = kitchenWorkers * 900;
      const dispatchCost = dispatchWorkers * 900;
      const costingPerPouch = meta.pouchesProduced > 0
        ? (kitchenCost + fillingCost) / meta.pouchesProduced
        : 0;

      // Production Quantity (Kg) = (pouches filled * (pack size + 0.005)) + wastage (Kg)
      const productionQuantityKg = Number(row.filledPouchWeightKg) + Number(row.wastage);

      // Variance = Kitchen Yield Qty - Production Quantity (Kg)
      const variance = Number(row.productionQty) - Number(productionQuantityKg);

      return {
        ...row,
        fillingWorkers,
        kitchenWorkers,
        dispatchWorkers,
        fillingCost,
        kitchenCost,
        dispatchCost,
        costingPerPouch,
        productionQuantityKg,
        variance,
      };
    })
    .sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey) ||
      a.shift.localeCompare(b.shift) ||
      a.buyerName.localeCompare(b.buyerName) ||
      a.productName.localeCompare(b.productName)
    );
}

function withGroupMeta(rows) {
  const groups = new Map();
  rows.forEach((row, index) => {
    const key = shiftKey(row.dateKey, row.shift);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  });

  return rows.map((row, index) => {
    const indices = groups.get(shiftKey(row.dateKey, row.shift));
    return {
      ...row,
      groupSpan: indices.length,
      isFirstInGroup: indices[0] === index,
      isLastInGroup: indices[indices.length - 1] === index,
    };
  });
}

const filterBtnClass = "border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 text-white rounded-xl px-4 py-2 text-xs font-semibold tracking-wider transition-all shadow-sm";
const filterMenuClass = "w-[280px] p-3 bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl text-white";

const Costing = () => {
  const { userinfo } = useSelector(state => state.auth);

  const [data, setData] = useState([]);
  const [month, setmonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(1);
  const [error, setError] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [buyerOpen, setBuyerOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [buyerFilter, setBuyerFilter] = useState(ALL);
  const [productFilter, setProductFilter] = useState(ALL);
  const [shiftFilter, setShiftFilter] = useState(ALL);
  const [hoveredGroup, setHoveredGroup] = useState(null);

  useEffect(() => {
    async function getData() {
      try {
        setLoading(1);
        setError(0);
        const res = await apiConnector(`${DATA_URL}/List/${month}`, "GET", null, { Authorization: `Bearer ${userinfo.token}` });
        setData(res.data.data);
        setBuyerFilter(ALL);
        setProductFilter(ALL);
        setShiftFilter(ALL);
        setLoading(0);
      } catch (e) {
        setError(1);
        setLoading(0);
        console.log(e);
      }
    }

    getData();
  }, [month, userinfo.token]);

  const allRows = useMemo(() => buildCostingRows(data), [data]);

  const buyerOptions = useMemo(
    () => [...new Set(allRows.map((row) => row.buyerName).filter(Boolean))].sort(),
    [allRows]
  );

  const productOptions = useMemo(() => {
    const source = buyerFilter === ALL
      ? allRows
      : allRows.filter((row) => row.buyerName === buyerFilter);
    return [...new Set(source.map((row) => row.productName).filter(Boolean))].sort();
  }, [allRows, buyerFilter]);

  const shiftOptions = useMemo(
    () => [...new Set(allRows.map((row) => row.shift).filter(Boolean))].sort(),
    [allRows]
  );

  const rows = useMemo(() => {
    const filtered = allRows.filter((row) => {
      if (buyerFilter !== ALL && row.buyerName !== buyerFilter) return false;
      if (productFilter !== ALL && row.productName !== productFilter) return false;
      if (shiftFilter !== ALL && row.shift !== shiftFilter) return false;
      return true;
    });
    return withGroupMeta(filtered);
  }, [allRows, buyerFilter, productFilter, shiftFilter]);

  const totals = useMemo(() => {
    const seenShifts = new Set();
    return rows.reduce((acc, row) => {
      const key = shiftKey(row.dateKey, row.shift);
      const isNewShift = !seenShifts.has(key);
      if (isNewShift) seenShifts.add(key);

      return {
        productionQty: acc.productionQty + row.productionQty,
        wastagePouches: acc.wastagePouches + row.wastagePouches,
        wastage: acc.wastage + row.wastage,
        productionQuantityKg: acc.productionQuantityKg + row.productionQuantityKg,
        pouchesProduced: acc.pouchesProduced + row.pouchesProduced,
        pouchPacked: acc.pouchPacked + row.pouchPacked,
        variance: acc.variance + row.variance,
        fillingWorkers: acc.fillingWorkers + (isNewShift ? row.fillingWorkers : 0),
        fillingCost: acc.fillingCost + (isNewShift ? row.fillingCost : 0),
        kitchenWorkers: acc.kitchenWorkers + (isNewShift ? row.kitchenWorkers : 0),
        kitchenCost: acc.kitchenCost + (isNewShift ? row.kitchenCost : 0),
        dispatchWorkers: acc.dispatchWorkers + (isNewShift ? row.dispatchWorkers : 0),
        dispatchCost: acc.dispatchCost + (isNewShift ? row.dispatchCost : 0),
      };
    }, {
      productionQty: 0,
      fillingWorkers: 0,
      fillingCost: 0,
      kitchenWorkers: 0,
      kitchenCost: 0,
      wastagePouches: 0,
      wastage: 0,
      productionQuantityKg: 0,
      pouchesProduced: 0,
      pouchPacked: 0,
      dispatchWorkers: 0,
      dispatchCost: 0,
      variance: 0,
    });
  }, [rows]);

  const totalCostingPerPouch = totals.pouchesProduced > 0
    ? (totals.fillingCost + totals.kitchenCost) / totals.pouchesProduced
    : 0;

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full space-y-6 text-start">
          {/* Header & Month Title */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  Financial Analytics
                </span>
                <span className="text-zinc-500 text-xs font-mono">• Shift Costing & Yield Variance</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Costing Ledger: <span className="text-primary">{months[month - 1].month}</span>
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Cross-shift labor allocation, material variance, packaging cost per pouch, and dispatch tracking.
              </p>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={filterBtnClass}>
                    📅 Month: {months[month - 1].month}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={filterMenuClass}>
                  <div className="grid grid-cols-3 gap-1.5">
                    {months.map((item, index) => (
                      <Button
                        key={item.month}
                        variant="ghost"
                        className="text-xs hover:bg-white/10 hover:text-primary rounded-lg"
                        onClick={() => {
                          setIsOpen(false);
                          setmonth(index + 1);
                        }}
                      >
                        {item.month}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={buyerOpen} onOpenChange={setBuyerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={filterBtnClass}>
                    👤 {buyerFilter === ALL ? "Buyer: All" : buyerFilter}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={`${filterMenuClass} max-h-72 overflow-auto`}>
                  <div className="grid grid-cols-1 gap-1">
                    <Button
                      variant="ghost"
                      className="text-xs justify-start hover:bg-white/10"
                      onClick={() => {
                        setBuyerOpen(false);
                        setBuyerFilter(ALL);
                        setProductFilter(ALL);
                      }}
                    >
                      All Buyers
                    </Button>
                    {buyerOptions.map((buyer) => (
                      <Button
                        key={buyer}
                        variant="ghost"
                        className="text-xs justify-start hover:bg-white/10 hover:text-primary"
                        onClick={() => {
                          setBuyerOpen(false);
                          setBuyerFilter(buyer);
                          setProductFilter(ALL);
                        }}
                      >
                        {buyer}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={productOpen} onOpenChange={setProductOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={filterBtnClass}>
                    📦 {productFilter === ALL ? "Product: All" : productFilter}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={`${filterMenuClass} max-h-72 overflow-auto`}>
                  <div className="grid grid-cols-1 gap-1">
                    <Button
                      variant="ghost"
                      className="text-xs justify-start hover:bg-white/10"
                      onClick={() => {
                        setProductOpen(false);
                        setProductFilter(ALL);
                      }}
                    >
                      All Products
                    </Button>
                    {productOptions.map((product) => (
                      <Button
                        key={product}
                        variant="ghost"
                        className="text-xs justify-start hover:bg-white/10 hover:text-primary"
                        onClick={() => {
                          setProductOpen(false);
                          setProductFilter(product);
                        }}
                      >
                        {product}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={shiftOpen} onOpenChange={setShiftOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={filterBtnClass}>
                    ⏱ {shiftFilter === ALL ? "Shift: All" : shiftFilter}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={filterMenuClass}>
                  <div className="grid grid-cols-1 gap-1">
                    <Button
                      variant="ghost"
                      className="text-xs justify-start hover:bg-white/10"
                      onClick={() => {
                        setShiftOpen(false);
                        setShiftFilter(ALL);
                      }}
                    >
                      All Shifts
                    </Button>
                    {shiftOptions.map((shift) => (
                      <Button
                        key={shift}
                        variant="ghost"
                        className="text-xs justify-start hover:bg-white/10 hover:text-primary"
                        onClick={() => {
                          setShiftOpen(false);
                          setShiftFilter(shift);
                        }}
                      >
                        {shift}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Quick KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[13px] font-mono uppercase text-zinc-400 block mb-1">Pouches Produced</span>
              <span className="text-xl font-bold font-mono text-white">{formatInt(totals.pouchesProduced)}</span>
              <span className="text-[12px] text-zinc-500 block mt-0.5">Total units packed</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[13px] font-mono uppercase text-zinc-400 block mb-1">Kitchen Yield</span>
              <span className="text-xl font-bold font-mono text-white">{formatNum(totals.productionQty)} Kg</span>
              <span className="text-[12px] text-zinc-500 block mt-0.5">Kitchen output</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[13px] font-mono uppercase text-zinc-400 block mb-1">Material Wastage</span>
              <span className="text-xl font-bold font-mono text-amber-400">{formatNum(totals.wastage)} Kg</span>
              <span className="text-[12px] text-zinc-500 block mt-0.5">{formatInt(totals.wastagePouches)} empty/leaked</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[13px] font-mono uppercase text-cyan-400 block mb-1">Production Qty</span>
              <span className="text-xl font-bold font-mono text-cyan-400">{formatNum(totals.productionQuantityKg)} Kg</span>
              <span className="text-[12px] text-zinc-500 block mt-0.5">Pouches × (Pack Size + 0.005) + Wastage</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[13px] font-mono uppercase text-zinc-400 block mb-1">Net Variance</span>
              <span className={`text-xl font-bold font-mono ${totals.variance < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {formatNum(totals.variance)} Kg
              </span>
              <span className="text-[12px] text-zinc-500 block mt-0.5">Kitchen - Production</span>
            </div>

            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 col-span-2 sm:col-span-1">
              <span className="text-[13px] font-mono uppercase text-primary block mb-1">Avg Cost / Pouch</span>
              <span className="text-xl font-bold font-mono text-primary">₹{formatNum(totalCostingPerPouch, 3)}</span>
              <span className="text-[12px] text-primary/70 block mt-0.5">Kitchen + Filling labor</span>
            </div>
          </div>

          {error ? (
            <div className="w-full p-16 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
              <p className="text-xl font-bold text-zinc-400">No Data Entry Found</p>
              <p className="text-xs text-zinc-500 mt-1">No production logs available for this period and filter selection.</p>
            </div>
          ) : loading ? (
            <Loader />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto max-h-[46rem]">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-[#141414] border-b border-white/10 shadow-lg">
                    <TableRow className="bg-[#141414] hover:bg-[#141414] border-b border-white/10">
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Date</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Shift</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Buyer</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Product Name</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5 border-l border-white/10">Yield Qty (Kg)</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouches</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Wastage (P)</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Wastage (Kg)</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Production Qty (Kg)</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Variance (Kg)</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5 border-l border-white/10">Fill Workers</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Fill Cost/P</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Kitch Workers</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Kitch Cost/Kg</TableHead>
                      <TableHead className="bg-[#141414] text-primary text-xs font-mono py-3.5">Cost/Pouch</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5 border-l border-white/10">Packed</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Disp Workers</TableHead>
                      <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Disp Cost/P</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {rows.length ? (
                      <>
                        {rows.map((row) => {
                          const groupId = shiftKey(row.dateKey, row.shift);
                          const isGroupHovered = hoveredGroup === groupId;
                          const hoverBg = isGroupHovered ? "bg-white/[0.04]" : "";
                          const mergeCell = `align-middle text-center bg-[#0d0d0d]/90 font-mono text-xs ${hoverBg}`;
                          return (
                            <TableRow
                              key={`${row.dateKey}-${row.buyerName}-${row.productName}-${row.shift}`}
                              data-group={groupId}
                              onMouseEnter={() => setHoveredGroup(groupId)}
                              onMouseLeave={(e) => {
                                const next = e.relatedTarget;
                                if (next instanceof Element) {
                                  const nextRow = next.closest("tr[data-group]");
                                  if (nextRow?.getAttribute("data-group") === groupId) return;
                                }
                                setHoveredGroup((prev) => (prev === groupId ? null : prev));
                              }}
                              className={`${row.isLastInGroup ? "border-b border-white/10" : "border-b border-white/5"} hover:bg-transparent`}
                            >
                              {row.isFirstInGroup && (
                                <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                  <span className="font-semibold text-white">{row.dateLabel}</span>
                                </TableCell>
                              )}
                              {row.isFirstInGroup && (
                                <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                  <span className={`px-2 py-0.5 rounded-full text-[13px] font-semibold ${
                                    row.shift === "Night" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  }`}>
                                    {row.shift}
                                  </span>
                                </TableCell>
                              )}
                              <TableCell className={`text-xs font-semibold text-zinc-300 py-3 ${hoverBg}`}>{row.buyerName}</TableCell>
                              <TableCell className={`text-xs text-white py-3 ${hoverBg}`}>{row.productName}</TableCell>
                              <TableCell className={`border-l border-white/5 font-mono text-xs text-zinc-300 py-3 ${hoverBg}`}>{formatNum(row.productionQty)}</TableCell>
                              <TableCell className={`font-mono text-xs text-white py-3 ${hoverBg}`}>{formatInt(row.pouchesProduced)}</TableCell>
                              <TableCell className={`font-mono text-xs text-zinc-400 py-3 ${hoverBg}`}>{formatInt(row.wastagePouches)}</TableCell>
                              <TableCell className={`font-mono text-xs text-amber-400 py-3 ${hoverBg}`}>{formatNum(row.wastage)}</TableCell>
                              <TableCell className={`font-mono text-xs text-cyan-400 font-semibold py-3 ${hoverBg}`}>{formatNum(row.productionQuantityKg)}</TableCell>
                              <TableCell className={`font-mono text-xs py-3 ${hoverBg} ${row.variance < 0 ? "text-rose-400 font-semibold" : "text-emerald-400"}`}>
                                {formatNum(row.variance)}
                              </TableCell>
                              {row.isFirstInGroup && (
                                <TableCell rowSpan={row.groupSpan} className={`border-l border-white/10 ${mergeCell}`}>
                                  {formatInt(row.fillingWorkers)}
                                </TableCell>
                              )}
                              {row.isFirstInGroup && (
                                <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                  ₹{formatNum((row.fillingCost) / row.pouchesProduced)}
                                </TableCell>
                              )}
                              {row.isFirstInGroup && (
                                <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                  {formatInt(row.kitchenWorkers)}
                                </TableCell>
                              )}
                              {row.isFirstInGroup && (
                                <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                  ₹{formatNum((row.kitchenCost) / row.productionQty)}
                                </TableCell>
                              )}
                              {row.isFirstInGroup && (
                                <TableCell rowSpan={row.groupSpan} className={`${mergeCell} text-primary font-bold`}>
                                  ₹{formatNum(row.costingPerPouch, 3)}
                                </TableCell>
                              )}
                              <TableCell className={`border-l border-white/5 font-mono text-xs text-zinc-300 py-3 ${hoverBg}`}>{formatInt(row.pouchPacked)}</TableCell>
                              {row.isFirstInGroup && (
                                <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                  {formatInt(row.dispatchWorkers)}
                                </TableCell>
                              )}
                              {row.isFirstInGroup && (
                                <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                  ₹{formatNum((row.dispatchCost) / row.pouchPacked)}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                        {/* Totals Row */}
                        <TableRow className="font-mono text-xs font-bold bg-[#141414] border-t-2 border-white/20 text-white">
                          <TableCell colSpan={4} className="py-4 text-primary uppercase tracking-wider">Month Summary Total:</TableCell>
                          <TableCell className="border-l border-white/10 py-4">{formatNum(totals.productionQty)}</TableCell>
                          <TableCell className="py-4">{formatInt(totals.pouchesProduced)}</TableCell>
                          <TableCell className="py-4">{formatInt(totals.wastagePouches)}</TableCell>
                          <TableCell className="py-4 text-amber-400">{formatNum(totals.wastage)}</TableCell>
                          <TableCell className="py-4 text-cyan-400 font-bold">{formatNum(totals.productionQuantityKg)}</TableCell>
                          <TableCell className={`py-4 ${totals.variance < 0 ? "text-rose-400" : "text-emerald-400"}`}>{formatNum(totals.variance)}</TableCell>
                          <TableCell className="border-l border-white/10 py-4">{formatInt(totals.fillingWorkers)}</TableCell>
                          <TableCell className="py-4">₹{formatNum((totals.fillingCost) / totals.pouchesProduced)}</TableCell>
                          <TableCell className="py-4">{formatInt(totals.kitchenWorkers)}</TableCell>
                          <TableCell className="py-4">₹{formatNum((totals.kitchenCost) / totals.productionQty)}</TableCell>
                          <TableCell className="py-4 text-primary font-black">₹{formatNum(totalCostingPerPouch, 3)}</TableCell>
                          <TableCell className="border-l border-white/10 py-4">{formatInt(totals.pouchPacked)}</TableCell>
                          <TableCell className="py-4">{formatInt(totals.dispatchWorkers)}</TableCell>
                          <TableCell className="py-4">₹{formatNum((totals.dispatchCost) / totals.pouchPacked)}</TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={18} className="text-center py-12 text-zinc-400 text-sm">
                          No matching records found for the selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

export default Costing
