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

const POUCH_WEIGHT_KG = 0.258;
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

const formatNum = (value, digits = 2) => num(value).toFixed(digits);

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
        kitchenCost: null,
        fillingWorkers: null,
        fillingCost: null,
        dispatchWorkers: null,
        dispatchCost: null,
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
      });
    }
    return map.get(key);
  }

  data.forEach((doc) => {
    const list = doc.dataList || [];
    if (!list.length) return;
    const { dateKey, dateLabel } = getDateInfo(doc.createdAt);
    const shift = normalizeShift(doc.dayTime);
    const meta = getMeta(dateKey, shift);
    const first = list[0];
    const section = doc.sectionMain;

    if (section === 'Kitchen' && meta.kitchenWorkers === null) {
      meta.kitchenWorkers = num(first.workersQuantity);
      meta.kitchenCost = num(first.costing);
    } else if (section === 'Filling' && meta.fillingWorkers === null) {
      meta.fillingWorkers = num(first.workersQuantity);
      meta.fillingCost = num(first.costing);
    } else if (section === 'Dispatch' && meta.dispatchWorkers === null) {
      meta.dispatchWorkers = num(first.workersQuantity);
      meta.dispatchCost = num(first.costing);
    }

    list.forEach(item => {
      const row = getRow(dateKey, dateLabel, item.buyerName, item.productName, shift);

      if (section === 'Kitchen') {
        row.productionQty += num(item.yield) * num(item.batchQuantity);
      } else if (section === 'Filling') {
        const pouches = num(item.pouchQuantity);
        row.pouchesProduced += pouches;
        meta.pouchesProduced += pouches;
        row.wastagePouches += num(item.empty);
        row.wastage += num(item.filled);
      } else if (section === 'Dispatch') {
        row.pouchPacked += num(item.pouchPacked);
        row.wastagePouches += num(item.leaked) + num(item.foreignMatter);
      }
    });
  });

  return Array.from(map.values())
    .map((row) => {
      const meta = getMeta(row.dateKey, row.shift);
      const fillingWorkers = meta.fillingWorkers ?? 0;
      const kitchenWorkers = meta.kitchenWorkers ?? 0;
      const dispatchWorkers = meta.dispatchWorkers ?? 0;
      const fillingCost = meta.fillingCost ?? 0;
      const kitchenCost = meta.kitchenCost ?? 0;
      const dispatchCost = meta.dispatchCost ?? 0;
      const costingPerPouch = meta.pouchesProduced > 0
        ? (kitchenCost + fillingCost) / meta.pouchesProduced
        : 0;
      // Keep full precision through the formula; format only when displaying
      const variance =
        Number(row.productionQty) -
        (Number(row.pouchesProduced) * POUCH_WEIGHT_KG) +
        Number(row.wastage);

      return {
        ...row,
        fillingWorkers,
        kitchenWorkers,
        dispatchWorkers,
        fillingCost,
        kitchenCost,
        dispatchCost,
        costingPerPouch,
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

const filterBtnClass = "border-primary text-primary hover:bg-primary/10";
const filterMenuClass = "w-[280px] p-2 bg-muted border-primary shadow-lg";

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
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-[100rem] mx-auto space-y-12 text-start">
          <div>
            <h2 className="text-xl font-semibold">Costing For <span className='text-primary'>{months[month - 1].month}</span></h2>

            <div className="flex flex-wrap items-center gap-3 bg-card my-5">
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={filterBtnClass}>
                    Month
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={filterMenuClass}>
                  <div className="grid grid-cols-3 gap-2">
                    {months.map((item, index) => (
                      <Button
                        key={item.month}
                        variant="ghost"
                        onClick={() => {
                          setIsOpen(false)
                          setmonth(index + 1);
                        }}>
                        {item.month}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={buyerOpen} onOpenChange={setBuyerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={filterBtnClass}>
                    {buyerFilter === ALL ? "Buyer" : buyerFilter}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={`${filterMenuClass} max-h-72 overflow-auto`}>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="ghost"
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
                    {productFilter === ALL ? "Product" : productFilter}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={`${filterMenuClass} max-h-72 overflow-auto`}>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="ghost"
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
                    {shiftFilter === ALL ? "Shift" : shiftFilter}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={filterMenuClass}>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="ghost"
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

          {
            error ? (
              <div className='sm:max-lg:mt-4 text-3xl font-bold text-center my-96'> No Data Entry Found</div>
            ) : (
              <div>
                {
                  loading ? (
                    <Loader />
                  ) : (
                    <div className="rounded-lg border bg-card [&>div]:max-h-[40rem]">
                      <Table>
                        <TableHeader className="sticky top-0 z-20 bg-muted shadow-sm">
                          <TableRow className="bg-muted hover:bg-muted border-b">
                            <TableHead className="bg-muted">Date</TableHead>
                            <TableHead className="bg-muted">Shift</TableHead>
                            <TableHead className="bg-muted">Buyer Name</TableHead>
                            <TableHead className="bg-muted">Product Name</TableHead>
                            <TableHead className="bg-muted border-l border-border">Production Quantity</TableHead>
                            <TableHead className="bg-muted">Pouches Produced</TableHead>
                            <TableHead className="bg-muted">Wastage Pouches</TableHead>
                            <TableHead className="bg-muted">Wastage</TableHead>
                            <TableHead className="bg-muted">Variance (Kg)</TableHead>
                            <TableHead className="bg-muted border-l border-border">Filling Workers</TableHead>
                            <TableHead className="bg-muted">Filling Costing</TableHead>
                            <TableHead className="bg-muted">Kitchen Workers</TableHead>
                            <TableHead className="bg-muted">Kitchen Costing</TableHead>
                            <TableHead className="bg-muted">Costing Per Pouch</TableHead>
                            <TableHead className="bg-muted border-l border-border">Pouch Packed</TableHead>
                            <TableHead className="bg-muted">Dispatch Workers</TableHead>
                            <TableHead className="bg-muted">Dispatch Costing</TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {rows.length ? (
                            <>
                              {rows.map((row) => {
                                const groupId = shiftKey(row.dateKey, row.shift);
                                const isGroupHovered = hoveredGroup === groupId;
                                const hoverBg = isGroupHovered ? "bg-muted/50" : "";
                                const mergeCell = `align-middle text-center ${hoverBg}`;
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
                                  className={`${row.isLastInGroup ? "border-b" : "border-b-0"} hover:bg-transparent`}
                                >
                                  {row.isFirstInGroup && (
                                    <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                      {row.dateLabel}
                                    </TableCell>
                                  )}
                                  {row.isFirstInGroup && (
                                    <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                      {row.shift}
                                    </TableCell>
                                  )}
                                  <TableCell className={hoverBg}>{row.buyerName}</TableCell>
                                  <TableCell className={hoverBg}>{row.productName}</TableCell>
                                  <TableCell className={`border-l border-border ${hoverBg}`}>{formatNum(row.productionQty)}</TableCell>
                                  <TableCell className={hoverBg}>{formatInt(row.pouchesProduced)}</TableCell>
                                  <TableCell className={hoverBg}>{formatInt(row.wastagePouches)}</TableCell>
                                  <TableCell className={hoverBg}>{formatNum(row.wastage)}</TableCell>
                                  <TableCell className={hoverBg}>{formatNum(row.variance)}</TableCell>
                                  {row.isFirstInGroup && (
                                    <TableCell rowSpan={row.groupSpan} className={`border-l border-border ${mergeCell}`}>
                                      {formatInt(row.fillingWorkers)}
                                    </TableCell>
                                  )}
                                  {row.isFirstInGroup && (
                                    <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                      {formatNum(row.fillingCost)}
                                    </TableCell>
                                  )}
                                  {row.isFirstInGroup && (
                                    <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                      {formatInt(row.kitchenWorkers)}
                                    </TableCell>
                                  )}
                                  {row.isFirstInGroup && (
                                    <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                      {formatNum(row.kitchenCost)}
                                    </TableCell>
                                  )}
                                  {row.isFirstInGroup && (
                                    <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                      {formatNum(row.costingPerPouch, 3)}
                                    </TableCell>
                                  )}
                                  <TableCell className={`border-l border-border ${hoverBg}`}>{formatInt(row.pouchPacked)}</TableCell>
                                  {row.isFirstInGroup && (
                                    <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                      {formatInt(row.dispatchWorkers)}
                                    </TableCell>
                                  )}
                                  {row.isFirstInGroup && (
                                    <TableCell rowSpan={row.groupSpan} className={mergeCell}>
                                      {formatNum(row.dispatchCost)}
                                    </TableCell>
                                  )}
                                </TableRow>
                                );
                              })}
                              <TableRow className="font-medium bg-muted/50 hover:bg-muted/50">
                                <TableCell colSpan={4}>Total:</TableCell>
                                <TableCell className="border-l border-border">{formatNum(totals.productionQty)}</TableCell>
                                <TableCell>{formatInt(totals.pouchesProduced)}</TableCell>
                                <TableCell>{formatInt(totals.wastagePouches)}</TableCell>
                                <TableCell>{formatNum(totals.wastage)}</TableCell>
                                <TableCell>{formatNum(totals.variance)}</TableCell>
                                <TableCell className="border-l border-border">{formatInt(totals.fillingWorkers)}</TableCell>
                                <TableCell>{formatNum(totals.fillingCost)}</TableCell>
                                <TableCell>{formatInt(totals.kitchenWorkers)}</TableCell>
                                <TableCell>{formatNum(totals.kitchenCost)}</TableCell>
                                <TableCell>{formatNum(totalCostingPerPouch, 3)}</TableCell>
                                <TableCell className="border-l border-border">{formatInt(totals.pouchPacked)}</TableCell>
                                <TableCell>{formatInt(totals.dispatchWorkers)}</TableCell>
                                <TableCell>{formatNum(totals.dispatchCost)}</TableCell>
                              </TableRow>
                            </>
                          ) : (
                            <TableRow>
                              <TableCell colSpan={17} className='text-3xl'>No Data Entry Found</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )
                }
              </div>
            )
          }
        </div>
      </div>
    </PageTransition>
  );
}

export default Costing
