import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  CheckCircle2,
  History,
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Users,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { INVENTORY_MRP_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';

const format3Decimals = (val) => {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const MaterialIssue = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [issues, setIssues] = useState([]);
  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [issueMode, setIssueMode] = useState('RECIPE'); // 'RECIPE' or 'ORDER'
  const [orderDateFilter, setOrderDateFilter] = useState('TODAY'); // 'TODAY', 'TOMORROW', 'ALL'
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [activeRecipe, setActiveRecipe] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [noOfBatches, setNoOfBatches] = useState('1');
  const [issueItems, setIssueItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [orderRes, issueRes, rmRes, recRes] = await Promise.all([
        apiConnector(`${INVENTORY_MRP_URL}/production-orders?status=PLANNED`, 'GET'),
        apiConnector(`${INVENTORY_MRP_URL}/material-issues`, 'GET'),
        apiConnector(`${INVENTORY_MRP_URL}/raw-materials`, 'GET'),
        apiConnector(`${INVENTORY_MRP_URL}/recipes`, 'GET')
      ]);

      if (orderRes.data?.success) setOrders(orderRes.data.data);
      if (issueRes.data?.success) setIssues(issueRes.data.data);
      if (rmRes.data?.success) setRawMaterials(rmRes.data.data);
      if (recRes.data?.success) setRecipes(recRes.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load kitchen issue data');
    } finally {
      setLoading(false);
    }
  };

  const buyers = Array.from(new Set(recipes.map((r) => r.buyerName?.trim()).filter(Boolean))).sort();

  const filteredRecipes = selectedBuyer
    ? recipes.filter((r) => (r.buyerName || '').trim().toLowerCase() === selectedBuyer.trim().toLowerCase())
    : recipes;

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const isTomorrow = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return (
      d.getFullYear() === tom.getFullYear() &&
      d.getMonth() === tom.getMonth() &&
      d.getDate() === tom.getDate()
    );
  };

  const getFilteredOrders = (filter) => {
    if (filter === 'TODAY') return orders.filter((o) => isToday(o.productionDate));
    if (filter === 'TOMORROW') return orders.filter((o) => isTomorrow(o.productionDate));
    return orders;
  };

  const getOrderCount = (filter) => {
    return getFilteredOrders(filter).length;
  };

  const filteredOrders = getFilteredOrders(orderDateFilter);

  const handleModeSwitch = (newMode) => {
    setIssueMode(newMode);
    setSelectedRecipeId('');
    setSelectedOrderId('');
    setActiveRecipe(null);
    setActiveOrder(null);
    setIssueItems([]);
    setNoOfBatches('1');
  };

  const handleRecipeSelect = (recId) => {
    setSelectedRecipeId(recId);
    if (!recId) {
      setActiveRecipe(null);
      setIssueItems([]);
      return;
    }
    const rec = recipes.find((r) => r._id === recId);
    setActiveRecipe(rec);
    setActiveOrder(null);
    setSelectedOrderId('');
    setNoOfBatches('1'); // single batch by default
    recalculateIssueItems(rec, null, 1);
  };

  const handleOrderSelect = (ordId) => {
    setSelectedOrderId(ordId);
    if (!ordId) {
      setActiveOrder(null);
      setIssueItems([]);
      return;
    }
    const ord = orders.find((o) => o._id === ordId);
    setActiveRecipe(null);
    setActiveOrder(ord);
    setSelectedRecipeId('');
    const batchCount = ord?.items?.[0]?.batches ? String(ord.items[0].batches) : '1';
    setNoOfBatches(batchCount);
    recalculateIssueItems(null, ord, parseFloat(batchCount) || 1);
  };

  const recalculateIssueItems = (rec, ord, batchesVal, currentMaterials) => {
    const materials = currentMaterials || rawMaterials;
    const bNum = parseFloat(batchesVal);
    const validBatches = isNaN(bNum) || bNum < 0 ? 0 : bNum;
    const itemMap = new Map();

    if (rec && rec.ingredients) {
      rec.ingredients.forEach((ing) => {
        let unitMultiplier = 1;
        if (ing.unit === 'g' || ing.unit === 'gm') unitMultiplier = 0.001;
        if (ing.unit === 'ml') unitMultiplier = 0.001;

        const edibleQty = parseFloat((Number(ing.edibleQuantity || 0) * validBatches).toFixed(3));
        const theoreticalGross = parseFloat(((Number(ing.edibleQuantity || 0) * unitMultiplier * (Number(ing.lossFactor) || 1.0)) * validBatches).toFixed(3));
        const targetUnit = ing.unit === 'g' || ing.unit === 'gm' ? 'kg' : (ing.unit === 'ml' ? 'L' : (ing.unit || 'kg'));

        const matchKey = ing.rawMaterial ? String(ing.rawMaterial) : ing.materialName.trim().toLowerCase();

        const matchedRm = materials.find((rm) =>
          (ing.rawMaterial && String(rm._id) === String(ing.rawMaterial)) ||
          rm.name.trim().toLowerCase() === ing.materialName.trim().toLowerCase()
        );

        const availStock = matchedRm ? (matchedRm.currentStock || 0) : 0;
        const actualIssued = theoreticalGross;
        const remaining = parseFloat((availStock - actualIssued).toFixed(3));

        itemMap.set(matchKey, {
          rawMaterialId: matchedRm ? matchedRm._id : ing.rawMaterial,
          materialName: matchedRm ? matchedRm.name : ing.materialName,
          edibleBase: Number(ing.edibleQuantity || 0),
          lossFactor: Number(ing.lossFactor) || 1.0,
          unitMultiplier,
          theoreticalEdibleQty: edibleQty,
          theoreticalGrossQty: theoreticalGross,
          availableStock: availStock,
          actualIssuedQty: actualIssued,
          remainingStock: remaining,
          unit: matchedRm ? matchedRm.baseUnit : targetUnit
        });
      });
    } else if (ord && ord.items) {
      ord.items.forEach((item) => {
        const recipe = item.recipe;
        if (!recipe || !recipe.ingredients) return;

        recipe.ingredients.forEach((ing) => {
          let unitMultiplier = 1;
          if (ing.unit === 'g' || ing.unit === 'gm') unitMultiplier = 0.001;
          if (ing.unit === 'ml') unitMultiplier = 0.001;

          const edibleQty = parseFloat((Number(ing.edibleQuantity || 0) * validBatches).toFixed(3));
          const theoreticalGross = parseFloat(((Number(ing.edibleQuantity || 0) * unitMultiplier * (Number(ing.lossFactor) || 1.0)) * validBatches).toFixed(3));
          const targetUnit = ing.unit === 'g' || ing.unit === 'gm' ? 'kg' : (ing.unit === 'ml' ? 'L' : (ing.unit || 'kg'));

          const matchKey = ing.rawMaterial ? String(ing.rawMaterial) : ing.materialName.trim().toLowerCase();

          if (itemMap.has(matchKey)) {
            const existing = itemMap.get(matchKey);
            existing.theoreticalEdibleQty = parseFloat((existing.theoreticalEdibleQty + edibleQty).toFixed(3));
            existing.theoreticalGrossQty = parseFloat((existing.theoreticalGrossQty + theoreticalGross).toFixed(3));
            existing.actualIssuedQty = parseFloat((existing.actualIssuedQty + theoreticalGross).toFixed(3));
            existing.remainingStock = parseFloat((existing.availableStock - existing.actualIssuedQty).toFixed(3));
          } else {
            const matchedRm = materials.find((rm) =>
              (ing.rawMaterial && String(rm._id) === String(ing.rawMaterial)) ||
              rm.name.trim().toLowerCase() === ing.materialName.trim().toLowerCase()
            );

            const availStock = matchedRm ? (matchedRm.currentStock || 0) : 0;
            const actualIssued = theoreticalGross;
            const remaining = parseFloat((availStock - actualIssued).toFixed(3));

            itemMap.set(matchKey, {
              rawMaterialId: matchedRm ? matchedRm._id : ing.rawMaterial,
              materialName: matchedRm ? matchedRm.name : ing.materialName,
              edibleBase: Number(ing.edibleQuantity || 0),
              lossFactor: Number(ing.lossFactor) || 1.0,
              unitMultiplier,
              theoreticalEdibleQty: edibleQty,
              theoreticalGrossQty: theoreticalGross,
              availableStock: availStock,
              actualIssuedQty: actualIssued,
              remainingStock: remaining,
              unit: matchedRm ? matchedRm.baseUnit : targetUnit
            });
          }
        });
      });
    }

    setIssueItems(Array.from(itemMap.values()));
  };

  const handleBatchesChange = (newVal) => {
    setNoOfBatches(newVal);
    const bNum = parseFloat(newVal);
    if (!isNaN(bNum) && bNum >= 0 && (activeRecipe || activeOrder)) {
      recalculateIssueItems(activeRecipe, activeOrder, bNum);
    }
  };

  const handleActualQtyChange = (idx, value) => {
    const updated = [...issueItems];
    const valNum = parseFloat(value);
    const parsedVal = isNaN(valNum) ? 0 : valNum;

    updated[idx].actualIssuedQty = value;
    const avail = updated[idx].availableStock || 0;
    updated[idx].remainingStock = parseFloat((avail - parsedVal).toFixed(3));
    setIssueItems(updated);
  };

  const handleConfirmIssue = async (e) => {
    e.preventDefault();
    if ((!activeRecipe && !selectedOrderId) || issueItems.length === 0) {
      toast.error('Please select an active recipe or production order with ingredients');
      return;
    }

    const bCount = parseFloat(noOfBatches) || 1;
    if (bCount <= 0) {
      toast.error('Number of batches must be greater than 0');
      return;
    }

    try {
      setIssuing(true);
      const payload = {
        productionOrderId: selectedOrderId || null,
        recipeId: activeRecipe ? activeRecipe._id : null,
        batches: bCount,
        buyerName: activeRecipe?.buyerName || activeOrder?.buyerName || activeOrder?.items?.[0]?.recipe?.buyerName || 'General',
        productName: activeRecipe?.productName || activeOrder?.items?.[0]?.productName || 'Recipe Issue',
        kitchenSupervisor: `Batch: ${bCount}`,
        items: issueItems.map((it) => ({
          ...it,
          openingStock: it.availableStock !== undefined ? parseFloat(Number(it.availableStock).toFixed(3)) : undefined,
          closingStock: it.remainingStock !== undefined ? parseFloat(Number(it.remainingStock).toFixed(3)) : undefined,
          actualIssuedQty: parseFloat((Number(it.actualIssuedQty) || 0).toFixed(3))
        })),
        notes
      };

      const res = await apiConnector(`${INVENTORY_MRP_URL}/material-issues`, 'POST', payload);
      if (res.data?.success) {
        toast.success(`Materials successfully issued for ${bCount} batch(es)!`);
        setSelectedRecipeId('');
        setSelectedOrderId('');
        setActiveRecipe(null);
        setActiveOrder(null);
        setIssueItems([]);
        setNotes('');
        setNoOfBatches('1');
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue materials');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
      {/* Back to Dashboard */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Kitchen Store Issue</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Hand off prep ingredients to kitchen kettles, track real-time warehouse available and remaining stock
          </p>
        </div>
      </div>

      {/* Issue Material Form */}
      <div className="bg-secondary/15 border border-white/10 rounded-2xl p-6 lg:p-8 mb-10 backdrop-blur-sm">
        <form onSubmit={handleConfirmIssue} className="space-y-6">
          {/* Step 1: Mode Switcher (Select Recipe vs Planned Production Order) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400">Issue From:</span>
              <button
                type="button"
                onClick={() => handleModeSwitch('RECIPE')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  issueMode === 'RECIPE'
                    ? 'bg-primary text-black shadow-md shadow-primary/20'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                Select Recipe (Single Batch)
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('ORDER')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  issueMode === 'ORDER'
                    ? 'bg-primary text-black shadow-md shadow-primary/20'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Planned Production Order
              </button>
            </div>

            {/* If Planned Production Order: Date Filter Buttons (Today, Tomorrow, All) */}
            {issueMode === 'ORDER' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 font-medium mr-1">Date:</span>
                {[
                  { id: 'TODAY', label: 'Today' },
                  { id: 'TOMORROW', label: 'Tomorrow' },
                  { id: 'ALL', label: 'All Orders' }
                ].map((df) => {
                  const count = getOrderCount(df.id);
                  return (
                    <button
                      key={df.id}
                      type="button"
                      onClick={() => {
                        setOrderDateFilter(df.id);
                        setSelectedOrderId('');
                        setActiveOrder(null);
                        setIssueItems([]);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        orderDateFilter === df.id
                          ? 'bg-primary/20 border border-primary text-primary font-semibold'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {df.label} <span className="font-mono text-[11px] opacity-80">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Form Controls */}
          {issueMode === 'RECIPE' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-primary" />
                  Select Buyer
                </label>
                <select
                  value={selectedBuyer}
                  onChange={(e) => {
                    setSelectedBuyer(e.target.value);
                    setSelectedRecipeId('');
                    setActiveRecipe(null);
                    setIssueItems([]);
                  }}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- All Buyers ({buyers.length}) --</option>
                  {buyers.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                  <UtensilsCrossed className="w-3 h-3 text-primary" />
                  Select Recipe *
                </label>
                <select
                  required
                  value={selectedRecipeId}
                  onChange={(e) => handleRecipeSelect(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose Recipe ({filteredRecipes.length}) --</option>
                  {filteredRecipes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.productName} {r.buyerName ? `(${r.buyerName})` : ''} — 1 Batch
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">No of Batches (can be decimal) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  placeholder="e.g. 1, 0.5, 1.5, 2.5"
                  value={noOfBatches}
                  onChange={(e) => handleBatchesChange(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Remarks / Shift Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Extra 2kg onion issued due to rot"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-primary" />
                  Select Planned Production Order ({orderDateFilter === 'TODAY' ? 'Today' : orderDateFilter === 'TOMORROW' ? 'Tomorrow' : 'All'}) *
                </label>
                <select
                  required
                  value={selectedOrderId}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose Production Order ({filteredOrders.length}) --</option>
                  {filteredOrders.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.orderNumber} ({new Date(o.productionDate).toLocaleDateString()}) - {o.items.map((i) => `${i.productName} (${i.batches}b)`).join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">No of Batches (can be decimal) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  placeholder="e.g. 1, 0.5, 1.5, 2.5"
                  value={noOfBatches}
                  onChange={(e) => handleBatchesChange(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Remarks / Shift Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Extra 2kg onion issued due to rot"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Dynamic Issue Table */}
          {issueItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Store Stock Verification & Issue Handoff
                </span>
                <span className="text-xs text-gray-400">
                  Remaining stock updates dynamically as issuing quantities are entered
                </span>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-gray-400">
                      <th className="py-3 px-4">Ingredient Name</th>
                      <th className="py-3 px-4 text-right">Edible Kettle Qty</th>
                      <th className="py-3 px-4 text-center">Loss Factor</th>
                      <th className="py-3 px-4 text-right">Theoretical Gross</th>
                      <th className="py-3 px-4 text-right font-semibold text-cyan-300">Available Stock</th>
                      <th className="py-3 px-4 text-right font-bold text-white">Issue Stock</th>
                      <th className="py-3 px-4 text-right font-semibold text-gray-200">Remaining Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {issueItems.map((item, idx) => {
                      const isNegative = Number(item.remainingStock) < 0;
                      return (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="py-3 px-4 font-medium text-white">{item.materialName}</td>
                          <td className="py-3 px-4 text-right font-mono text-gray-300">
                            {format3Decimals(item.theoreticalEdibleQty)} {item.unit}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-orange-400">
                            {format3Decimals(item.lossFactor)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-gray-200">
                            {format3Decimals(item.theoreticalGrossQty)} {item.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-cyan-300">
                            {format3Decimals(item.availableStock)} {item.unit}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              required
                              value={item.actualIssuedQty}
                              onChange={(e) => handleActualQtyChange(idx, e.target.value)}
                              className="w-28 bg-black border border-primary/50 text-right rounded-lg px-2.5 py-1 text-xs text-primary font-mono font-bold focus:outline-none focus:border-primary"
                            />
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {isNegative ? (
                              <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                {format3Decimals(item.remainingStock)} {item.unit} (Deficit)
                              </span>
                            ) : (
                              <span className="text-emerald-400">
                                {format3Decimals(item.remainingStock)} {item.unit}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10 mt-6">
                <button
                  type="submit"
                  disabled={issuing}
                  className="px-6 py-2.5 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 disabled:opacity-50 text-sm shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {issuing ? 'Deducting Stock...' : 'Confirm Issue & Deduct Warehouse Stock'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Previous Issues Audit Trail */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Kitchen Store Material Issue History
        </h2>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader />
          </div>
        ) : issues.length === 0 ? (
          <div className="bg-secondary/10 border border-white/10 rounded-2xl p-8 text-center text-gray-400 text-sm">
            No previous kitchen material issues logged yet.
          </div>
        ) : (
          <div className="bg-secondary/10 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3 w-8 text-center"></th>
                    <th className="py-3 px-4">Issue No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Recipe / Product</th>
                    <th className="py-3 px-4 text-center">Batches</th>
                    <th className="py-3 px-4 text-center">Items Handed Over</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {issues.map((iss) => {
                    const isExpanded = expandedIssueId === iss._id;
                    const totalQty = iss.totalIssuedKg || (iss.items || []).reduce((s, it) => s + (it.actualIssuedQty || 0), 0);

                    return (
                      <React.Fragment key={iss._id}>
                        <tr
                          onClick={() => setExpandedIssueId(isExpanded ? null : iss._id)}
                          className={`hover:bg-white/10 cursor-pointer transition-colors ${
                            isExpanded ? 'bg-white/10 border-b border-primary/30' : ''
                          }`}
                          title="Click to view issued materials with opening & closing stock"
                        >
                          <td className="py-3 px-3 text-center">
                            <span className="p-1 rounded-lg text-gray-400 hover:text-white inline-flex items-center">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-primary" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-primary">{iss.issueNumber}</td>
                          <td className="py-3 px-4 text-gray-300">{new Date(iss.issueDate).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-mono text-gray-200">
                            {iss.productName || iss.productionOrder?.orderNumber || 'Recipe Issue'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-primary">
                            {iss.batches !== undefined && iss.batches !== null ? `${iss.batches} b` : '1 b'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                              {iss.items?.length || 0} Materials
                              <span className="text-[10px] text-gray-400">
                                ({isExpanded ? 'Collapse' : 'Click to view'})
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400">{iss.notes || '—'}</td>
                        </tr>

                        {/* Dropdown breakdown row for all materials issued */}
                        {isExpanded && (
                          <tr className="bg-black/60 border-b border-white/15">
                            <td colSpan={7} className="p-3 sm:p-5">
                              <div className="bg-secondary/25 border border-white/10 rounded-xl p-4 shadow-inner">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-white/10">
                                  <div className="flex items-center gap-2">
                                    <UtensilsCrossed className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                                      Issued Materials Breakdown ({iss.items?.length || 0} items)
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono ml-2">
                                      Total Issued: <strong className="text-white">{format3Decimals(totalQty)} kg</strong>
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-gray-400">
                                    Click row again to collapse
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-white/5 border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider font-semibold">
                                        <th className="py-2.5 px-3">#</th>
                                        <th className="py-2.5 px-4 font-medium">Material Name</th>
                                        <th className="py-2.5 px-4 text-right font-semibold text-cyan-300">
                                          Opening Stock
                                        </th>
                                        <th className="py-2.5 px-4 text-right font-bold text-primary">
                                          Issued Stock
                                        </th>
                                        <th className="py-2.5 px-4 text-right font-semibold text-emerald-400">
                                          Closing Stock
                                        </th>
                                        <th className="py-2.5 px-4 text-right text-gray-400">Theoretical Gross</th>
                                        <th className="py-2.5 px-3 text-center">Unit</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                      {(iss.items || []).map((item, itIdx) => {
                                        const issuedVal = Number(item.actualIssuedQty) || 0;
                                        const openingVal =
                                          item.openingStock !== undefined && item.openingStock !== null
                                            ? Number(item.openingStock)
                                            : item.closingStock !== undefined && item.closingStock !== null
                                            ? Number(item.closingStock) + issuedVal
                                            : (Number(item.availableStock) || issuedVal);

                                        const closingVal =
                                          item.closingStock !== undefined && item.closingStock !== null
                                            ? Number(item.closingStock)
                                            : Math.max(0, openingVal - issuedVal);

                                        return (
                                          <tr key={itIdx} className="hover:bg-white/5 transition-colors">
                                            <td className="py-2.5 px-3 font-mono text-gray-500">{itIdx + 1}</td>
                                            <td className="py-2.5 px-4 font-medium text-white">
                                              {item.materialName}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-cyan-300">
                                              {format3Decimals(openingVal)} {item.unit || 'kg'}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono font-bold text-primary">
                                              - {format3Decimals(issuedVal)} {item.unit || 'kg'}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-400">
                                              {format3Decimals(closingVal)} {item.unit || 'kg'}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono text-gray-400">
                                              {format3Decimals(item.theoreticalGrossQty)} {item.unit || 'kg'}
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-gray-400 font-mono">
                                              {item.unit || 'kg'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialIssue;
