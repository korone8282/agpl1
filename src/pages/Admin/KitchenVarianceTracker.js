import React, { useState, useEffect } from 'react';
import {
  Scale,
  PlusCircle,
  History,
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Building2,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronUp
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

const KitchenVarianceTracker = () => {
  const navigate = useNavigate();

  // Master Data
  const [issues, setIssues] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingFilling, setFetchingFilling] = useState({});

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Form State
  const [selectedIssueNumber, setSelectedIssueNumber] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [buyerName, setBuyerName] = useState('');
  const [productName, setProductName] = useState('');
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [issuedQuantityKg, setIssuedQuantityKg] = useState(0);
  const [kitchenSupervisor, setKitchenSupervisor] = useState('Kitchen Supervisor');
  const [notes, setNotes] = useState('');

  // Global extra fill weight x (grams)
  const [globalExtraWeightG, setGlobalExtraWeightG] = useState(8);

  // Multiple Batch Rows
  const [batchRows, setBatchRows] = useState([
    {
      id: 1,
      batchCode: '',
      shift: 'Day',
      pouchesFilled: 0,
      packSizeG: 250,
      extraWeightG: 8,
      wastageKg: 0,
      synced: false
    }
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [issuesRes, recipesRes, varianceRes] = await Promise.all([
        apiConnector(`${INVENTORY_MRP_URL}/material-issues`, 'GET'),
        apiConnector(`${INVENTORY_MRP_URL}/recipes`, 'GET'),
        apiConnector(`${INVENTORY_MRP_URL}/kitchen-variance`, 'GET')
      ]);

      if (issuesRes.data?.success) setIssues(issuesRes.data.data);
      if (recipesRes.data?.success) setRecipes(recipesRes.data.data);
      if (varianceRes.data?.success) setRecords(varianceRes.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load initial variance tracking data');
    } finally {
      setLoading(false);
    }
  };

  // When an Issue Number is chosen
  const handleSelectIssue = (issueNum) => {
    setSelectedIssueNumber(issueNum);
    if (!issueNum) {
      setSelectedIssue(null);
      setBuyerName('');
      setProductName('');
      setIssuedQuantityKg(0);
      return;
    }

    const iss = issues.find((i) => i.issueNumber === issueNum);
    if (!iss) return;

    setSelectedIssue(iss);
    setBuyerName(iss.buyerName || 'General');
    setProductName(iss.productName || '');

    // Total issued kg
    const totalIssued = iss.totalIssuedKg || iss.items?.reduce((sum, item) => sum + (item.actualIssuedQty || 0), 0) || 0;
    setIssuedQuantityKg(parseFloat(totalIssued.toFixed(3)));

    if (iss.kitchenSupervisor) setKitchenSupervisor(iss.kitchenSupervisor);

    // Try to find matching recipe nominal pack size
    const matchedRecipe = recipes.find(
      (r) =>
        r.productName?.trim().toLowerCase() === iss.productName?.trim().toLowerCase() &&
        (!iss.buyerName || (r.buyerName || 'General').trim().toLowerCase() === iss.buyerName?.trim().toLowerCase())
    );

    let defaultPackG = 250;
    if (matchedRecipe && matchedRecipe.batchCookedWeightKg > 0 && matchedRecipe.nominalBatchYieldPouches > 0) {
      defaultPackG = Math.round((matchedRecipe.batchCookedWeightKg * 1000) / matchedRecipe.nominalBatchYieldPouches);
    }

    // Reset batch rows with new defaults
    setBatchRows([
      {
        id: Date.now(),
        batchCode: '',
        shift: 'Day',
        pouchesFilled: 0,
        packSizeG: defaultPackG,
        extraWeightG: globalExtraWeightG,
        wastageKg: 0,
        synced: false
      }
    ]);
  };

  // Fetch filling data for a specific row
  const fetchFillingDataForRow = async (idx) => {
    const row = batchRows[idx];
    if (!row.batchCode.trim()) {
      toast.warning('Please enter a Batch Code first');
      return;
    }

    try {
      setFetchingFilling((prev) => ({ ...prev, [idx]: true }));
      const params = new URLSearchParams({
        batchCode: row.batchCode.trim(),
        shift: row.shift,
        productName: productName.trim(),
        buyerName: buyerName.trim()
      });

      const res = await apiConnector(`${INVENTORY_MRP_URL}/filling-lookup?${params.toString()}`, 'GET');
      if (res.data?.success && res.data.found) {
        const fillData = res.data.data;
        const updated = [...batchRows];
        updated[idx].pouchesFilled = fillData.pouchesFilled || updated[idx].pouchesFilled;
        if (fillData.packSizeG) updated[idx].packSizeG = fillData.packSizeG;
        updated[idx].wastageKg = fillData.wastageKg || updated[idx].wastageKg;
        updated[idx].synced = true;
        setBatchRows(updated);
        toast.success(`Found filling data for batch ${row.batchCode}! Synced ${fillData.pouchesFilled} pouches.`);
      } else {
        toast.info(`No filling record found for batch "${row.batchCode}". Enter values manually.`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to lookup filling data');
    } finally {
      setFetchingFilling((prev) => ({ ...prev, [idx]: false }));
    }
  };

  // Add new batch row
  const handleAddBatchRow = () => {
    const lastRow = batchRows[batchRows.length - 1];
    setBatchRows([
      ...batchRows,
      {
        id: Date.now(),
        batchCode: '',
        shift: lastRow ? (lastRow.shift === 'Day' ? 'Night' : 'Day') : 'Day',
        pouchesFilled: 0,
        packSizeG: lastRow ? lastRow.packSizeG : 250,
        extraWeightG: globalExtraWeightG,
        wastageKg: 0,
        synced: false
      }
    ]);
  };

  // Remove batch row
  const handleRemoveBatchRow = (idx) => {
    if (batchRows.length <= 1) return;
    setBatchRows(batchRows.filter((_, i) => i !== idx));
  };

  // Update batch row field
  const handleRowChange = (idx, field, value) => {
    const updated = [...batchRows];
    updated[idx][field] = value;
    setBatchRows(updated);
  };

  // Apply global extra fill weight x to all batch rows
  const handleApplyGlobalExtraWeight = (newX) => {
    const xNum = parseFloat(newX) || 0;
    setGlobalExtraWeightG(xNum);
    setBatchRows((prev) =>
      prev.map((row) => ({
        ...row,
        extraWeightG: xNum
      }))
    );
  };

  // Real-time batch calculation roll-ups
  const computedBatches = batchRows.map((r) => {
    const pouches = Number(r.pouchesFilled) || 0;
    const packSize = Number(r.packSizeG) || 250;
    const extra = Number(r.extraWeightG) || 0;
    const actualPouchWeightKg = parseFloat(((packSize + extra) / 1000).toFixed(4));
    const filledWeightKg = parseFloat((pouches * actualPouchWeightKg).toFixed(3));
    const wastage = parseFloat((Number(r.wastageKg) || 0).toFixed(3));
    const batchYieldKg = parseFloat((filledWeightKg + wastage).toFixed(3));

    return {
      ...r,
      actualPouchWeightKg,
      filledWeightKg,
      wastageKg: wastage,
      batchYieldKg
    };
  });

  const totalFilledPouches = computedBatches.reduce((sum, b) => sum + (Number(b.pouchesFilled) || 0), 0);
  const totalFilledWeightKg = parseFloat(computedBatches.reduce((sum, b) => sum + b.filledWeightKg, 0).toFixed(3));
  const totalWastageKg = parseFloat(computedBatches.reduce((sum, b) => sum + b.wastageKg, 0).toFixed(3));
  const totalYieldKg = parseFloat((totalFilledWeightKg + totalWastageKg).toFixed(3));

  // Matching recipe and BOM theoretical gross calculations
  const matchedRecipe = recipes.find(
    (r) =>
      r.productName?.trim().toLowerCase() === productName.trim().toLowerCase() &&
      (!buyerName || (r.buyerName || 'General').trim().toLowerCase() === buyerName.trim().toLowerCase())
  );

  let theoreticalGrossTotalKg = 0;
  const ingredientBreakdown = [];

  if (matchedRecipe && matchedRecipe.ingredients && matchedRecipe.ingredients.length > 0) {
    const nominalPouches = matchedRecipe.nominalBatchYieldPouches || 250;
    const nominalWeight = matchedRecipe.batchCookedWeightKg || 0;

    // Scale factor: either by total accounted yield vs nominal cooked weight or total pouches vs nominal pouches
    const batchScaleFactor =
      nominalWeight > 0
        ? totalYieldKg / nominalWeight
        : nominalPouches > 0
        ? totalFilledPouches / nominalPouches
        : 1.0;

    matchedRecipe.ingredients.forEach((ing) => {
      let multiplier = 1;
      if (ing.unit === 'g' || ing.unit === 'gm' || ing.unit === 'ml') multiplier = 0.001;

      const theoGross = parseFloat(
        (ing.edibleQuantity * multiplier * (ing.lossFactor || 1.0) * batchScaleFactor).toFixed(3)
      );
      theoreticalGrossTotalKg += theoGross;

      // Find actual issued qty for this ingredient from selected issue
      let issuedItemQty = 0;
      if (selectedIssue && selectedIssue.items) {
        const found = selectedIssue.items.find(
          (it) => it.materialName?.trim().toLowerCase() === ing.materialName?.trim().toLowerCase()
        );
        if (found) issuedItemQty = found.actualIssuedQty || 0;
      }

      ingredientBreakdown.push({
        materialName: ing.materialName,
        actualIssuedQty: parseFloat(issuedItemQty.toFixed(3)),
        theoreticalGrossQty: theoGross,
        varianceQty: parseFloat((issuedItemQty - theoGross).toFixed(3)),
        unit: ing.unit === 'g' || ing.unit === 'gm' ? 'kg' : ing.unit
      });
    });
  }

  theoreticalGrossTotalKg = parseFloat(theoreticalGrossTotalKg.toFixed(3));
  const netYieldVarianceKg = parseFloat((totalYieldKg - issuedQuantityKg).toFixed(3));
  const variancePercent = issuedQuantityKg > 0 ? parseFloat(((netYieldVarianceKg / issuedQuantityKg) * 100).toFixed(3)) : 0;

  // Submit to database
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!productName.trim()) {
      toast.error('Please select an Issue Number or enter Product Name');
      return;
    }

    if (issuedQuantityKg <= 0) {
      toast.error('Issued Raw Material quantity must be greater than 0');
      return;
    }

    if (batchRows.some((b) => !b.batchCode.trim())) {
      toast.error('Please enter a Batch Code for every row');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        issueNumber: selectedIssueNumber,
        buyerName: buyerName.trim() || 'General',
        productName: productName.trim(),
        productionDate,
        issuedQuantityKg,
        batches: computedBatches.map((b) => ({
          batchCode: b.batchCode.trim(),
          shift: b.shift,
          pouchesFilled: Number(b.pouchesFilled) || 0,
          packSizeG: Number(b.packSizeG) || 250,
          extraWeightG: Number(b.extraWeightG) || 0,
          actualPouchWeightKg: b.actualPouchWeightKg,
          filledWeightKg: b.filledWeightKg,
          wastageKg: b.wastageKg,
          batchYieldKg: b.batchYieldKg
        })),
        totalFilledPouches,
        totalFilledWeightKg,
        totalWastageKg,
        totalYieldKg,
        theoreticalGrossKg: theoreticalGrossTotalKg,
        varianceKg: netYieldVarianceKg,
        variancePercent,
        ingredientBreakdown,
        supervisor: kitchenSupervisor,
        notes
      };

      const res = await apiConnector(`${INVENTORY_MRP_URL}/kitchen-variance`, 'POST', payload);
      if (res.data?.success) {
        toast.success(`Kitchen Variance successfully logged for ${payload.productName}!`);
        // Reset form
        setSelectedIssueNumber('');
        setSelectedIssue(null);
        setBuyerName('');
        setProductName('');
        setIssuedQuantityKg(0);
        setBatchRows([
          {
            id: Date.now(),
            batchCode: '',
            shift: 'Day',
            pouchesFilled: 0,
            packSizeG: 250,
            extraWeightG: globalExtraWeightG,
            wastageKg: 0,
            synced: false
          }
        ]);
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit kitchen variance record');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered History Records
  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      !searchTerm ||
      (rec.batchNumber && rec.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rec.productName && rec.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rec.issueNumber && rec.issueNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rec.buyerName && rec.buyerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesShift = !shiftFilter || rec.shift === shiftFilter;
    return matchesSearch && matchesShift;
  });

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
            <Scale className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Kitchen Variance Tracker</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Calculate batch yield variance by linking Store Issue Numbers with Filling Data & BOM theoretical requirements
          </p>
        </div>

        <button
          onClick={fetchInitialData}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/10 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-primary" />
          Refresh Data
        </button>
      </div>

      {/* Primary Entry Card: Issue Linking & Multi-Batch Reconciliation */}
      <div className="bg-secondary/15 border border-white/10 rounded-2xl p-6 lg:p-8 mb-10 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Issue Selection & Meta Info */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary block mb-3">
              1. Link Kitchen Store Issue
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Select Store Issue Number *
                </label>
                <select
                  required
                  value={selectedIssueNumber}
                  onChange={(e) => handleSelectIssue(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose Store Issue --</option>
                  {issues.map((iss) => (
                    <option key={iss._id} value={iss.issueNumber}>
                      {iss.issueNumber} ({iss.buyerName || 'General'} - {iss.productName || 'Recipe'}) [
                      {format3Decimals(iss.totalIssuedKg || 0)} kg]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Production Date *</label>
                <input
                  type="date"
                  required
                  value={productionDate}
                  onChange={(e) => setProductionDate(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Buyer Name</label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Auto-filled from issue"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Auto-filled from issue"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Total Issued RM (kg) *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={issuedQuantityKg}
                  onChange={(e) => setIssuedQuantityKg(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-primary font-mono font-bold focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Multi-Batch Entry & Auto Filling Data Fetch */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary block">
                  2. Batch Yields & Pouch Filling Data
                </span>
                <span className="text-[11px] text-gray-400">
                  Multiple batch codes made for the same day with adjustable extra fill weight (+x)
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Global Extra Weight x Setting in Header */}
                <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 px-3 py-1 rounded-xl text-xs">
                  <span className="text-gray-400">Default Extra Fill (x):</span>
                  <input
                    type="number"
                    step="0.1"
                    value={globalExtraWeightG}
                    onChange={(e) => handleApplyGlobalExtraWeight(e.target.value)}
                    className="w-14 bg-white/5 border border-white/20 text-center rounded px-1.5 py-0.5 text-xs text-primary font-mono font-bold"
                  />
                  <span className="text-primary font-semibold">g</span>
                </div>

                <button
                  type="button"
                  onClick={handleAddBatchRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-primary" />
                  + Add Batch Row
                </button>
              </div>
            </div>

            {/* Batch Rows Table */}
            <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-gray-400">
                    <th className="py-2.5 px-3">Batch Code *</th>
                    <th className="py-2.5 px-3">Shift</th>
                    <th className="py-2.5 px-3 text-center">Filling Data</th>
                    <th className="py-2.5 px-3 text-right">Pouches Filled *</th>
                    <th className="py-2.5 px-3 text-center">Nominal Pack Size</th>
                    <th className="py-2.5 px-3 text-center text-primary font-semibold">
                      Extra Wt +x (g)
                    </th>
                    <th className="py-2.5 px-3 text-center">Actual Fill Wt</th>
                    <th className="py-2.5 px-3 text-right">Wastage (kg)</th>
                    <th className="py-2.5 px-3 text-right font-bold text-white">Batch Yield (kg)</th>
                    <th className="py-2.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {batchRows.map((row, idx) => {
                    const actualPouchWeightG = (Number(row.packSizeG) || 250) + (Number(row.extraWeightG) || 0);
                    const actualPouchWeightKg = actualPouchWeightG / 1000;
                    const filledWt = (Number(row.pouchesFilled) || 0) * actualPouchWeightKg;
                    const batchYield = filledWt + (Number(row.wastageKg) || 0);

                    return (
                      <tr key={row.id || idx} className="hover:bg-white/5">
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            required
                            placeholder="e.g. B-01"
                            value={row.batchCode}
                            onChange={(e) => handleRowChange(idx, 'batchCode', e.target.value)}
                            className="w-24 bg-black border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold focus:outline-none focus:border-primary"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <select
                            value={row.shift}
                            onChange={(e) => handleRowChange(idx, 'shift', e.target.value)}
                            className="bg-black border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-primary"
                          >
                            <option value="Day">Day</option>
                            <option value="Night">Night</option>
                          </select>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            disabled={fetchingFilling[idx]}
                            onClick={() => fetchFillingDataForRow(idx)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                              row.synced
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            {fetchingFilling[idx] ? 'Fetching...' : row.synced ? 'Synced' : 'Fetch Log'}
                          </button>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            required
                            placeholder="0"
                            value={row.pouchesFilled}
                            onChange={(e) => handleRowChange(idx, 'pouchesFilled', e.target.value)}
                            className="w-20 bg-black border border-white/10 text-right rounded-lg px-2 py-1 text-xs text-white font-mono font-bold focus:outline-none focus:border-primary"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="1"
                              value={row.packSizeG}
                              onChange={(e) => handleRowChange(idx, 'packSizeG', e.target.value)}
                              className="w-14 bg-black border border-white/10 text-center rounded-lg px-1.5 py-1 text-xs text-gray-300 font-mono"
                            />
                            <span className="text-[11px] text-gray-500">g</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={row.extraWeightG}
                              onChange={(e) => handleRowChange(idx, 'extraWeightG', e.target.value)}
                              className="w-14 bg-black border border-primary/40 text-center rounded-lg px-1.5 py-1 text-xs text-primary font-mono font-bold focus:outline-none focus:border-primary"
                            />
                            <span className="text-[11px] text-primary">g</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono text-gray-300">
                          {actualPouchWeightG}g <span className="text-[10px] text-gray-500">({actualPouchWeightKg.toFixed(3)}kg)</span>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            placeholder="0.000"
                            value={row.wastageKg}
                            onChange={(e) => handleRowChange(idx, 'wastageKg', e.target.value)}
                            className="w-20 bg-black border border-white/10 text-right rounded-lg px-2 py-1 text-xs text-orange-400 font-mono focus:outline-none focus:border-primary"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                          {format3Decimals(batchYield)} kg
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          {batchRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBatchRow(idx)}
                              className="text-gray-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 3: Interactive Yield & Theoretical Gross Comparison Cards */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary block mb-3">
              3. Final Yield & BOM Theoretical Gross Comparison
            </span>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-black/60 p-4 rounded-xl border border-white/10">
                <span className="text-gray-400 block text-[11px]">RM Issued (Store Issue)</span>
                <span className="text-lg font-mono font-bold text-gray-200 mt-1 block">
                  {format3Decimals(issuedQuantityKg)} kg
                </span>
                <span className="text-[10px] text-gray-500 mt-0.5 block">
                  {selectedIssueNumber || 'Direct Issue'}
                </span>
              </div>

              <div className="bg-black/60 p-4 rounded-xl border border-white/10">
                <span className="text-gray-400 block text-[11px]">Total Accounted Final Yield</span>
                <span className="text-lg font-mono font-bold text-cyan-300 mt-1 block">
                  {format3Decimals(totalYieldKg)} kg
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  {totalFilledPouches} pcs ({format3Decimals(totalFilledWeightKg)}kg) + {format3Decimals(totalWastageKg)}kg Waste
                </span>
              </div>

              <div className="bg-black/60 p-4 rounded-xl border border-white/10">
                <span className="text-gray-400 block text-[11px]">BOM Theoretical Gross</span>
                <span className="text-lg font-mono font-bold text-purple-300 mt-1 block">
                  {format3Decimals(theoreticalGrossTotalKg)} kg
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  {matchedRecipe ? 'Scaled from Recipe BOM' : 'No BOM Linked'}
                </span>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  netYieldVarianceKg < 0
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : netYieldVarianceKg > 0
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-black/60 border-white/10'
                }`}
              >
                <span className="text-gray-400 block text-[11px]">Net Kitchen Variance</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {netYieldVarianceKg < 0 ? (
                    <TrendingDown className="w-5 h-5 text-rose-400" />
                  ) : netYieldVarianceKg > 0 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  ) : null}
                  <span
                    className={`text-lg font-mono font-bold ${
                      netYieldVarianceKg < 0
                        ? 'text-rose-400'
                        : netYieldVarianceKg > 0
                        ? 'text-emerald-400'
                        : 'text-gray-300'
                    }`}
                  >
                    {netYieldVarianceKg > 0 ? `+${format3Decimals(netYieldVarianceKg)}` : format3Decimals(netYieldVarianceKg)} kg
                  </span>
                </div>
                <span
                  className={`text-[11px] font-mono mt-0.5 block ${
                    netYieldVarianceKg < 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {variancePercent > 0 ? `+${format3Decimals(variancePercent)}%` : `${format3Decimals(variancePercent)}%`}
                </span>
              </div>
            </div>
          </div>

          {/* Optional: Ingredient-level reconciliation table if BOM exists */}
          {ingredientBreakdown.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary block mb-2">
                Ingredient BOM Theoretical vs Issued Breakdown
              </span>

              <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-gray-400">
                      <th className="p-2.5">Ingredient</th>
                      <th className="p-2.5 text-right">Actual Issued Qty</th>
                      <th className="p-2.5 text-right">BOM Theoretical Req.</th>
                      <th className="p-2.5 text-right">Variance Qty</th>
                      <th className="p-2.5 text-center">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {ingredientBreakdown.map((it, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-2.5 font-sans font-medium text-white">{it.materialName}</td>
                        <td className="p-2.5 text-right text-gray-200">{format3Decimals(it.actualIssuedQty)}</td>
                        <td className="p-2.5 text-right text-purple-300">{format3Decimals(it.theoreticalGrossQty)}</td>
                        <td className="p-2.5 text-right">
                          <span className={it.varianceQty > 0 ? 'text-orange-400' : it.varianceQty < 0 ? 'text-emerald-400' : 'text-gray-400'}>
                            {it.varianceQty > 0 ? `+${format3Decimals(it.varianceQty)}` : format3Decimals(it.varianceQty)}
                          </span>
                        </td>
                        <td className="p-2.5 text-center text-gray-400 font-sans">{it.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Supervisor & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/10 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Kitchen Supervisor Name</label>
              <input
                type="text"
                value={kitchenSupervisor}
                onChange={(e) => setKitchenSupervisor(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Notes / Remarks</label>
              <input
                type="text"
                placeholder="e.g. 2 batch codes cooked on same day, minor 0.5kg kettle residue"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 disabled:opacity-50 text-sm shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Saving Kitchen Variance...' : 'Log Kitchen Batch Variance'}
            </button>
          </div>
        </form>
      </div>

      {/* Historical Logs & Audit Trail */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Kitchen Batch Variance Audit History
          </h2>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search batch, issue, product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary w-52"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-black border border-white/10 rounded-xl px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs"
              >
                <option value="" className="bg-black">All Shifts</option>
                <option value="Day" className="bg-black">Day Shift</option>
                <option value="Night" className="bg-black">Night Shift</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-secondary/10 border border-white/10 rounded-2xl p-8 text-center text-gray-400 text-sm">
            No kitchen batch variance records logged yet. Use the form above to record your first batch!
          </div>
        ) : (
          <div className="bg-secondary/10 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Date & Issue No</th>
                    <th className="py-3 px-4">Buyer & Product</th>
                    <th className="py-3 px-4">Batches</th>
                    <th className="py-3 px-4 text-right">RM Issued (kg)</th>
                    <th className="py-3 px-4 text-right">Pouches Filled</th>
                    <th className="py-3 px-4 text-right">Total Yield (kg)</th>
                    <th className="py-3 px-4 text-right">BOM Theo. Gross</th>
                    <th className="py-3 px-4 text-right">Net Variance (kg)</th>
                    <th className="py-3 px-4 text-center">Variance (%)</th>
                    <th className="py-3 px-2 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRecords.map((r) => {
                    const isLoss = r.varianceKg < 0;
                    const isGain = r.varianceKg > 0;
                    const isExpanded = expandedLogId === r._id;

                    return (
                      <React.Fragment key={r._id}>
                        <tr className="hover:bg-white/5">
                          <td className="py-3 px-4">
                            <span className="text-white block font-medium">
                              {new Date(r.productionDate).toLocaleDateString()}
                            </span>
                            <span className="font-mono text-[10px] text-primary block">
                              {r.issueNumber || 'Direct'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-white/5 border border-white/10 text-primary">
                                {r.buyerName || 'General'}
                              </span>
                            </div>
                            <span className="font-medium text-white block">{r.productName}</span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-white block">
                              {r.batches && r.batches.length > 0
                                ? r.batches.map((b) => b.batchCode).join(', ')
                                : r.batchNumber}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {r.batches?.length || 1} batch code(s)
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-gray-200">
                            {format3Decimals(r.issuedQuantityKg)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-gray-300">
                            {r.totalFilledPouches || r.pouchesFilled} pcs
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-cyan-300">
                            {format3Decimals(r.totalYieldKg || r.totalAccountedKg)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-purple-300">
                            {format3Decimals(r.theoreticalGrossKg || 0)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {isLoss ? (
                              <span className="text-rose-400">{format3Decimals(r.varianceKg)}</span>
                            ) : isGain ? (
                              <span className="text-emerald-400">+{format3Decimals(r.varianceKg)}</span>
                            ) : (
                              <span className="text-gray-400">0.000</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center font-mono">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] ${
                                Math.abs(r.variancePercent) > 5
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : Math.abs(r.variancePercent) > 0
                                  ? 'bg-orange-500/10 text-orange-300'
                                  : 'bg-emerald-500/10 text-emerald-400'
                              }`}
                            >
                              {r.variancePercent > 0 ? `+${format3Decimals(r.variancePercent)}%` : `${format3Decimals(r.variancePercent)}%`}
                            </span>
                          </td>

                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : r._id)}
                              className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {isExpanded && (
                          <tr className="bg-black/40">
                            <td colSpan={10} className="p-4 border-b border-white/10">
                              <div className="space-y-3">
                                {r.batches && r.batches.length > 0 && (
                                  <div>
                                    <span className="text-[11px] font-semibold uppercase text-primary block mb-1">
                                      Batch Breakdown:
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {r.batches.map((b, bIdx) => (
                                        <div
                                          key={bIdx}
                                          className="bg-white/5 border border-white/5 p-2 rounded-lg text-[11px] font-mono"
                                        >
                                          <div className="font-bold text-white mb-0.5">
                                            {b.batchCode} ({b.shift} Shift)
                                          </div>
                                          <div className="text-gray-400">
                                            {b.pouchesFilled} pcs @ {b.packSizeG}g (+{b.extraWeightG}g x) = {format3Decimals(b.filledWeightKg)}kg
                                          </div>
                                          <div className="text-gray-400">
                                            Wastage: {format3Decimals(b.wastageKg)}kg | Yield: {format3Decimals(b.batchYieldKg)}kg
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {r.ingredientBreakdown && r.ingredientBreakdown.length > 0 && (
                                  <div>
                                    <span className="text-[11px] font-semibold uppercase text-purple-400 block mb-1">
                                      Ingredient BOM Variance:
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      {r.ingredientBreakdown.map((ing, ingIdx) => (
                                        <div
                                          key={ingIdx}
                                          className="bg-white/5 border border-white/5 p-2 rounded-lg text-[11px]"
                                        >
                                          <div className="font-medium text-white truncate">{ing.materialName}</div>
                                          <div className="font-mono text-gray-400 text-[10px]">
                                            Issued: {format3Decimals(ing.actualIssuedQty)} | BOM: {format3Decimals(ing.theoreticalGrossQty)} {ing.unit}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="text-[11px] text-gray-400">
                                  <span>Supervisor: <strong className="text-white">{r.supervisor || 'Supervisor'}</strong></span>
                                  {r.notes && <span className="ml-4">• Notes: <strong className="text-gray-300">{r.notes}</strong></span>}
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

export default KitchenVarianceTracker;
