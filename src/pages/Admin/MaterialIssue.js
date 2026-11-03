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
  ChevronRight,
  Trash2
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

const isNonStandardUnit = (unit) => {
  if (!unit) return false;
  const u = String(unit).trim().toLowerCase();
  if (!u) return false;
  return !['kg', 'kgs', 'g', 'gm', 'gms', 'l', 'ltr', 'ml'].includes(u);
};

const getMaterialVariants = (mat) => {
  if (!mat) return [];
  const arr = Array.isArray(mat.unitWeightVariants)
    ? mat.unitWeightVariants.map(Number).filter((n) => !isNaN(n) && n > 0)
    : [];
  if (arr.length === 0 && mat.unitWeightKg && Number(mat.unitWeightKg) > 0) {
    arr.push(Number(mat.unitWeightKg));
  }
  return arr;
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
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [issueItems, setIssueItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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

  const buildIssueRow = (ing, rowKey, validBatches, materials, cumulativeIssuedByRm) => {
    let unitMultiplier = 1;
    const ingUnitLower = String(ing.unit || 'kg').trim().toLowerCase();
    if (ingUnitLower === 'g' || ingUnitLower === 'gm') unitMultiplier = 0.001;
    if (ingUnitLower === 'ml') unitMultiplier = 0.001;

    const recipeEdibleKg = parseFloat((Number(ing.edibleQuantity || 0) * unitMultiplier * validBatches).toFixed(3));
    const recipeGrossKg = parseFloat(
      (Number(ing.edibleQuantity || 0) * unitMultiplier * (Number(ing.lossFactor) || 1.0) * validBatches).toFixed(3)
    );
    const targetUnit =
      ingUnitLower === 'g' || ingUnitLower === 'gm'
        ? 'kg'
        : ingUnitLower === 'ml'
        ? 'L'
        : ing.unit || 'kg';

    const matchedRm = materials.find(
      (rm) =>
        (ing.rawMaterial && String(rm._id) === String(ing.rawMaterial)) ||
        rm.name.trim().toLowerCase() === ing.materialName.trim().toLowerCase()
    );

    const rmKey = matchedRm ? String(matchedRm._id) : ing.materialName.trim().toLowerCase();
    const availStock = matchedRm ? matchedRm.currentStock || 0 : 0;
    const stockUnit = matchedRm ? matchedRm.baseUnit : targetUnit;
    const variants = getMaterialVariants(matchedRm);
    const isRmNonStd = isNonStandardUnit(stockUnit);

    const selectedVariantKg =
      isRmNonStd && variants.length > 0
        ? Number(variants[0])
        : isRmNonStd && matchedRm?.unitWeightKg
        ? Number(matchedRm.unitWeightKg)
        : null;

    // Recipe quantities ALWAYS remain in the recipe's own unit (kg)
    const theoreticalEdibleQty = recipeEdibleKg;
    const theoreticalGrossQty = recipeGrossKg;

    // For standard kg items, prefill with theoreticalGrossQty; for non-standard units (e.g. tin), let user select variant & enter tin qty
    const actualIssued = isRmNonStd ? '' : theoreticalGrossQty;
    const actualIssuedNum = parseFloat(actualIssued) || 0;
    const previouslyIssued = cumulativeIssuedByRm.get(rmKey) || 0;
    const remaining = parseFloat((availStock - previouslyIssued - actualIssuedNum).toFixed(3));
    cumulativeIssuedByRm.set(rmKey, previouslyIssued + actualIssuedNum);

    return {
      rowKey,
      rawMaterialId: matchedRm ? matchedRm._id : ing.rawMaterial,
      materialName: matchedRm ? matchedRm.name : ing.materialName,
      edibleBase: Number(ing.edibleQuantity || 0),
      lossFactor: Number(ing.lossFactor) || 1.0,
      unitMultiplier,
      recipeEdibleKg,
      recipeGrossKg,
      variants,
      unitWeightKg: selectedVariantKg,
      theoreticalEdibleQty,
      theoreticalGrossQty,
      availableStock: availStock,
      actualIssuedQty: actualIssued,
      remainingStock: remaining,
      unit: stockUnit,
      stockUnit,
      recipeUnit: targetUnit,
      notes: ing.notes || ''
    };
  };

  const recalculateIssueItems = (rec, ord, batchesVal, currentMaterials) => {
    const materials = currentMaterials || rawMaterials;
    const bNum = parseFloat(batchesVal);
    const validBatches = isNaN(bNum) || bNum < 0 ? 0 : bNum;
    const items = [];
    const cumulativeIssuedByRm = new Map();

    if (rec && rec.ingredients) {
      rec.ingredients.forEach((ing, ingIdx) => {
        const rmKey = ing.rawMaterial || ing.materialName.trim().toLowerCase();
        items.push(buildIssueRow(ing, `${rmKey}_${ingIdx}`, validBatches, materials, cumulativeIssuedByRm));
      });
    } else if (ord && ord.items) {
      ord.items.forEach((item, ordItemIdx) => {
        const recipe = item.recipe;
        if (!recipe || !recipe.ingredients) return;

        recipe.ingredients.forEach((ing, ingIdx) => {
          const rmKey = ing.rawMaterial || ing.materialName.trim().toLowerCase();
          items.push(
            buildIssueRow(ing, `${rmKey}_${ordItemIdx}_${ingIdx}`, validBatches, materials, cumulativeIssuedByRm)
          );
        });
      });
    }

    setIssueItems(items);
  };

  const handleVariantChange = (idx, newVariantVal) => {
    const variantKg = parseFloat(newVariantVal);
    if (isNaN(variantKg) || variantKg <= 0) return;

    const updated = [...issueItems];
    updated[idx] = {
      ...updated[idx],
      unitWeightKg: variantKg
    };

    setIssueItems(updated);
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
    updated[idx].actualIssuedQty = value;

    // Recalculate remainingStock progressively across all rows
    const cumulative = new Map();
    updated.forEach((it) => {
      const rmKey = String(it.rawMaterialId || it.materialName).trim().toLowerCase();
      const usedBefore = cumulative.get(rmKey) || 0;
      const numVal = parseFloat(it.actualIssuedQty);
      const thisIssued = isNaN(numVal) ? 0 : numVal;
      it.remainingStock = parseFloat(((it.availableStock || 0) - usedBefore - thisIssued).toFixed(3));
      cumulative.set(rmKey, usedBefore + thisIssued);
    });

    setIssueItems(updated);
  };

  const handleDeleteIssue = async (issueId, issueNumber) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete Kitchen Issue #${issueNumber}? This will revert and restore all warehouse raw material stock deductions caused by this issue.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(issueId);
      const res = await apiConnector(`${INVENTORY_MRP_URL}/material-issues/${issueId}`, 'DELETE');
      if (res.data?.success) {
        toast.success(`Kitchen Issue #${issueNumber} deleted and stock restored!`);
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete kitchen issue');
    } finally {
      setDeletingId(null);
    }
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
        issueDate: issueDate || new Date().toISOString().split('T')[0],
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
          {/* Step 1: Mode Switcher (Left Top: Issue From | Right Top: Issued On) */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex flex-wrap items-center gap-2">
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

            {/* Right Top of Box: Issued On Date Picker (+ Order Filter if in ORDER mode) */}
            <div className="flex flex-wrap items-center gap-4 ml-auto">
              {issueMode === 'ORDER' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 font-medium mr-1">Filter POs:</span>
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

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5 whitespace-nowrap">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Issued On:
                </label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="bg-black border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-primary"
                />
              </div>
            </div>
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
                      <th className="py-3 px-3 w-10 text-center font-mono text-gray-400">#</th>
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
                      const stockUnit = item.stockUnit || item.unit || 'kg';
                      const recipeUnit = item.recipeUnit || 'kg';
                      const isNonStd = isNonStandardUnit(stockUnit);
                      const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
                      const activeVariantKg = Number(item.unitWeightKg) || 0;
                      const issuedUnitsNum = Number(item.actualIssuedQty) || 0;
                      const issuedKgVal = isNonStd && activeVariantKg > 0 ? issuedUnitsNum * activeVariantKg : issuedUnitsNum;

                      return (
                        <tr key={item.rowKey || idx} className="hover:bg-white/5">
                          <td className="py-3 px-3 text-center font-mono text-gray-500">{idx + 1}</td>
                          <td className="py-3 px-4 font-medium text-white">
                            <div>{item.materialName}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-300">
                            {format3Decimals(item.theoreticalEdibleQty)} {recipeUnit}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-orange-400">
                            {format3Decimals(item.lossFactor)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-gray-200">
                            {format3Decimals(item.theoreticalGrossQty)} {recipeUnit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-cyan-300">
                            {isNonStd && activeVariantKg > 0 ? (
                              <div>
                                <div>{format3Decimals(item.availableStock * activeVariantKg)} kg</div>
                                <div className="text-[10px] text-cyan-400/75 font-normal">
                                  ({format3Decimals(activeVariantKg)} kg × {format3Decimals(item.availableStock)} {stockUnit})
                                </div>
                              </div>
                            ) : (
                              <div>
                                {format3Decimals(item.availableStock)} {stockUnit}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isNonStd ? (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                  {hasVariants ? (
                                    <select
                                      value={activeVariantKg || item.variants[0]}
                                      onChange={(e) => handleVariantChange(idx, e.target.value)}
                                      className="bg-black border border-emerald-500/50 rounded-lg px-2 py-1 text-xs text-emerald-300 font-mono font-semibold focus:outline-none focus:border-primary cursor-pointer"
                                      title={`Select ${stockUnit} weight variant (in kg)`}
                                    >
                                      {item.variants.map((v, vIdx) => (
                                        <option key={vIdx} value={v}>
                                          {format3Decimals(v)} kg / {stockUnit}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        step="any"
                                        min="0.001"
                                        placeholder="Wt (kg)"
                                        value={item.unitWeightKg || ''}
                                        onChange={(e) => handleVariantChange(idx, e.target.value)}
                                        className="w-20 bg-black border border-emerald-500/50 text-right rounded-lg px-2 py-1 text-xs text-emerald-300 font-mono focus:outline-none focus:border-primary"
                                      />
                                      <span className="text-[10px] font-mono text-gray-400">kg/{stockUnit}</span>
                                    </div>
                                  )}
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    required
                                    placeholder={`Qty (${stockUnit})`}
                                    value={item.actualIssuedQty}
                                    onChange={(e) => handleActualQtyChange(idx, e.target.value)}
                                    className="w-24 bg-black border border-primary/50 text-right rounded-lg px-2.5 py-1 text-xs text-primary font-mono font-bold focus:outline-none focus:border-primary"
                                  />
                                  <span className="text-[11px] font-mono text-gray-300">{stockUnit}</span>
                                </div>
                                {activeVariantKg > 0 && (
                                  <span className="text-[10px] font-mono text-emerald-400">
                                    {format3Decimals(activeVariantKg)} kg × {format3Decimals(issuedUnitsNum)} {stockUnit} ={' '}
                                    <strong>{format3Decimals(issuedKgVal)} kg</strong>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  required
                                  value={item.actualIssuedQty}
                                  onChange={(e) => handleActualQtyChange(idx, e.target.value)}
                                  className="w-28 bg-black border border-primary/50 text-right rounded-lg px-2.5 py-1 text-xs text-primary font-mono font-bold focus:outline-none focus:border-primary"
                                />
                                <span className="text-[11px] font-mono text-gray-400">{stockUnit}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {isNegative ? (
                              <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                {isNonStd && activeVariantKg > 0
                                  ? `${format3Decimals(item.remainingStock * activeVariantKg)} kg (${format3Decimals(item.remainingStock)} ${stockUnit})`
                                  : `${format3Decimals(item.remainingStock)} ${stockUnit}`}{' '}
                                (Deficit)
                              </span>
                            ) : isNonStd && activeVariantKg > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="text-emerald-400">
                                  {format3Decimals(item.remainingStock * activeVariantKg)} kg
                                </span>
                                <span className="text-[10px] text-emerald-400/75 font-normal">
                                  ({format3Decimals(activeVariantKg)} kg × {format3Decimals(item.remainingStock)} {stockUnit})
                                </span>
                              </div>
                            ) : (
                              <span className="text-emerald-400">
                                {format3Decimals(item.remainingStock)} {stockUnit}
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
                    <th className="py-3 px-4 text-center">Actions</th>
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
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleDeleteIssue(iss._id, iss.issueNumber)}
                              disabled={deletingId === iss._id}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/25 transition-all text-xs flex items-center gap-1.5 mx-auto disabled:opacity-50"
                              title="Delete issue and undo warehouse stock reductions"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{deletingId === iss._id ? 'Reverting...' : 'Delete'}</span>
                            </button>
                          </td>
                        </tr>

                        {/* Dropdown breakdown row for all materials issued */}
                        {isExpanded && (
                          <tr className="bg-black/60 border-b border-white/15">
                            <td colSpan={8} className="p-3 sm:p-5">
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

                                        const isItNonStd = isNonStandardUnit(item.unit) && Number(item.unitWeightKg) > 0;
                                        const wtKg = Number(item.unitWeightKg) || 0;

                                        return (
                                          <tr key={itIdx} className="hover:bg-white/5 transition-colors">
                                            <td className="py-2.5 px-3 font-mono text-gray-500">{itIdx + 1}</td>
                                            <td className="py-2.5 px-4 font-medium text-white">
                                              <div>{item.materialName}</div>
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-cyan-300">
                                              {isItNonStd ? (
                                                <div>
                                                  <div>{format3Decimals(openingVal * wtKg)} kg</div>
                                                  <div className="text-[10px] font-normal text-cyan-400/75">
                                                    ({format3Decimals(wtKg)} kg × {format3Decimals(openingVal)} {item.unit})
                                                  </div>
                                                </div>
                                              ) : (
                                                <span>{format3Decimals(openingVal)} {item.unit || 'kg'}</span>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono font-bold text-primary">
                                              {isItNonStd ? (
                                                <div>
                                                  <div>- {format3Decimals(issuedVal * wtKg)} kg</div>
                                                  <div className="text-[10px] font-normal text-emerald-400">
                                                    ({format3Decimals(wtKg)} kg × {format3Decimals(issuedVal)} {item.unit})
                                                  </div>
                                                </div>
                                              ) : (
                                                <div>- {format3Decimals(issuedVal)} {item.unit || 'kg'}</div>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-400">
                                              {isItNonStd ? (
                                                <div>
                                                  <div>{format3Decimals(closingVal * wtKg)} kg</div>
                                                  <div className="text-[10px] font-normal text-emerald-400/75">
                                                    ({format3Decimals(wtKg)} kg × {format3Decimals(closingVal)} {item.unit})
                                                  </div>
                                                </div>
                                              ) : (
                                                <span>{format3Decimals(closingVal)} {item.unit || 'kg'}</span>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono text-gray-400">
                                              {format3Decimals(item.recipeGrossKg || item.theoreticalGrossQty)} kg
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
