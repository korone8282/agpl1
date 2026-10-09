import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Plus,
  ShoppingCart,
  AlertTriangle,
  Clock,
  PackageCheck,
  CheckCircle2,
  ThermometerSnowflake,
  Package,
  Layers,
  ArrowLeft,
  X
} from 'lucide-react';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { INVENTORY_MRP_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';

const PurchasePlanner = () => {
  const navigate = useNavigate();
  const [mrpData, setMrpData] = useState([]);
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // New Production Order Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [newOrder, setNewOrder] = useState({
    productName: '',
    targetPouches: '',
    productionDate: new Date().toISOString().split('T')[0],
    priority: 'NORMAL',
    notes: ''
  });

  // Selected items for PO Generation
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [generatingPo, setGeneratingPo] = useState(false);

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [orderRes, recRes] = await Promise.all([
        apiConnector(`${INVENTORY_MRP_URL}/production-orders`, 'GET'),
        apiConnector(`${INVENTORY_MRP_URL}/recipes`, 'GET')
      ]);

      if (orderRes.data?.success) setOrders(orderRes.data.data);
      if (recRes.data?.success) setRecipes(recRes.data.data);

      await runMrpCalculation();
    } catch (err) {
      console.error(err);
      toast.error('Failed to load production planner data');
    } finally {
      setLoading(false);
    }
  };

  const runMrpCalculation = async () => {
    try {
      setCalculating(true);
      const res = await apiConnector(`${INVENTORY_MRP_URL}/mrp/calculate`, 'GET');
      if (res.data?.success) {
        setMrpData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to run MRP calculation');
    } finally {
      setCalculating(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newOrder.productName || !newOrder.targetPouches) {
      toast.error('Product and target pouches are required');
      return;
    }

    try {
      const payload = {
        productionDate: newOrder.productionDate,
        priority: newOrder.priority,
        notes: newOrder.notes,
        items: [
          {
            productName: newOrder.productName,
            targetPouches: Number(newOrder.targetPouches)
          }
        ]
      };

      const res = await apiConnector(`${INVENTORY_MRP_URL}/production-orders`, 'POST', payload);
      if (res.data?.success) {
        toast.success('Production order scheduled successfully!');
        setShowOrderModal(false);
        setNewOrder({
          productName: '',
          targetPouches: '',
          productionDate: new Date().toISOString().split('T')[0],
          priority: 'NORMAL',
          notes: ''
        });
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create production order');
    }
  };

  const toggleSelectItem = (matName) => {
    const updated = new Set(selectedItems);
    if (updated.has(matName)) updated.delete(matName);
    else updated.add(matName);
    setSelectedItems(updated);
  };

  const selectAllShortages = () => {
    const shortages = mrpData.filter((r) => r.isShortage).map((r) => r.materialName);
    setSelectedItems(new Set(shortages));
  };

  const handleCreatePurchaseOrder = async () => {
    if (selectedItems.size === 0) {
      toast.warning('Please select at least one material to generate a PO');
      return;
    }

    const itemsToOrder = mrpData
      .filter((r) => selectedItems.has(r.materialName))
      .map((r) => ({
        rawMaterialId: r.rawMaterialId,
        materialName: r.materialName,
        materialCode: r.materialCode,
        storageType: r.storageType,
        requiredNetQty: r.shortfallQuantity,
        packSize: r.packSize,
        orderQty: r.suggestedOrderQty,
        unit: r.baseUnit,
        estimatedRate: r.lastPurchaseRate
      }));

    try {
      setGeneratingPo(true);
      const res = await apiConnector(`${INVENTORY_MRP_URL}/purchase-orders`, 'POST', {
        supplier: 'Consolidated Supplier',
        items: itemsToOrder,
        notes: 'Auto-generated from MRP Shortage Planner'
      });

      if (res.data?.success) {
        toast.success(`Purchase Order ${res.data.data.poNumber} generated successfully!`);
        setSelectedItems(new Set());
        runMrpCalculation();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate Purchase Order');
    } finally {
      setGeneratingPo(false);
    }
  };

  // Helper for batch calculation preview
  const selectedRecipeObj = recipes.find((r) => r.productName === newOrder.productName);
  const calculatedBatches =
    selectedRecipeObj && newOrder.targetPouches
      ? (Number(newOrder.targetPouches) / selectedRecipeObj.nominalBatchYieldPouches).toFixed(2)
      : '0.00';

  const totalShortages = mrpData.filter((r) => r.isShortage).length;
  const urgentOrders = mrpData.filter((r) => r.isUrgent).length;
  const estimatedTotalCost = mrpData
    .filter((r) => r.isShortage)
    .reduce((acc, r) => acc + (r.estimatedOrderCost || 0), 0);

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
              <CalendarDays className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Material Requirements & Purchase Planner (MRP)</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Time-phased chronological requirement engine with decimal batch scaling, prep loss factors & bag rounding
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOrderModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 transition-all text-sm shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Schedule Production Order
            </button>
            <button
              onClick={runMrpCalculation}
              disabled={calculating}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-all text-sm"
            >
              {calculating ? 'Calculating...' : 'Recalculate MRP'}
            </button>
          </div>
        </div>

        {/* MRP Stat Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-secondary/20 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Scheduled Orders</span>
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div className="text-2xl font-bold">{orders.length}</div>
            <div className="text-xs text-gray-400 mt-1">Active planned pouch batches</div>
          </div>

          <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-rose-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Materials in Deficit</span>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-rose-300">{totalShortages}</div>
            <div className="text-xs text-gray-400 mt-1">Require purchase order</div>
          </div>

          <div className="bg-orange-950/20 border border-orange-500/20 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-orange-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Urgent / Due Today</span>
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-orange-300">{urgentOrders}</div>
            <div className="text-xs text-gray-400 mt-1">Order deadline reached based on lead time</div>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Est. Procurement Cost</span>
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-emerald-300">₹{estimatedTotalCost.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">Based on latest vendor prices</div>
          </div>
        </div>

        {/* Section 1: Active Planned Production Orders */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Active Planned Production Batches
            </h2>
            <span className="text-xs text-gray-400">{orders.length} Planned Batches</span>
          </div>

          {orders.length === 0 ? (
            <div className="bg-secondary/10 border border-white/10 rounded-2xl p-6 text-center text-gray-400 text-sm">
              No production orders scheduled yet. Click "Schedule Production Order" above to enter your pouch targets.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((ord) => (
                <div
                  key={ord._id}
                  className="bg-secondary/15 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-gray-400">{ord.orderNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[13px] font-semibold ${
                        ord.priority === 'URGENT'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-primary/20 text-primary border border-primary/30'
                      }`}
                    >
                      {ord.priority}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="text-sm font-semibold text-gray-300">
                      Date: <span className="text-white">{new Date(ord.productionDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-white/10 pt-3">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white">{it.productName}</span>
                        <div className="text-right">
                          <span className="text-primary font-mono font-bold">{it.targetPouches} pouches</span>
                          <span className="text-gray-400 ml-1">({it.batches} batches)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Live MRP Calculation & Shortage Table */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Live Material Requirement & Shortage Matrix
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Multiplied with prep loss factors & rounded up to commercial bag sizes
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={selectAllShortages}
                className="text-xs text-gray-400 hover:text-white underline"
              >
                Select All Shortages
              </button>
              <button
                onClick={handleCreatePurchaseOrder}
                disabled={selectedItems.size === 0 || generatingPo}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 disabled:opacity-50 text-xs shadow-lg shadow-primary/20"
              >
                <PackageCheck className="w-4 h-4" />
                Generate PO ({selectedItems.size} items)
              </button>
            </div>
          </div>

          {loading || calculating ? (
            <div className="py-20 flex justify-center">
              <Loader />
            </div>
          ) : mrpData.length === 0 ? (
            <div className="bg-secondary/10 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
              <p className="text-lg font-medium text-gray-300">All Material Requirements Covered</p>
              <p className="text-sm mt-1 text-gray-500">
                No active production orders require purchasing right now.
              </p>
            </div>
          ) : (
            <div className="bg-secondary/10 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                      <th className="py-4 px-4 text-center">Select</th>
                      <th className="py-4 px-4">Material Name</th>
                      <th className="py-4 px-3">Storage</th>
                      <th className="py-4 px-3 text-right">Gross Required</th>
                      <th className="py-4 px-3 text-right">Current Stock</th>
                      <th className="py-4 px-3 text-right">Safety Buffer</th>
                      <th className="py-4 px-3 text-right">Net Shortfall</th>
                      <th className="py-4 px-3 text-center">Pack / Bag</th>
                      <th className="py-4 px-3 text-right font-bold text-primary">Commercial Order</th>
                      <th className="py-4 px-3 text-center">Order-By Deadline</th>
                      <th className="py-4 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mrpData.map((row) => {
                      const isSelected = selectedItems.has(row.materialName);
                      return (
                        <tr
                          key={row.materialName}
                          className={`hover:bg-white/5 transition-colors ${
                            row.isUrgent ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="py-4 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!row.isShortage}
                              onChange={() => toggleSelectItem(row.materialName)}
                              className="rounded border-white/20 bg-black text-primary focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-4 px-4 font-medium text-white">
                            <div>{row.materialName}</div>
                            {row.preferredSupplier && (
                              <div className="text-[13px] text-gray-500">Vendor: {row.preferredSupplier}</div>
                            )}
                          </td>
                          <td className="py-4 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-medium border ${
                                row.storageType === 'Cold'
                                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                              }`}
                            >
                              {row.storageType === 'Cold' ? (
                                <ThermometerSnowflake className="w-2.5 h-2.5" />
                              ) : (
                                <Package className="w-2.5 h-2.5" />
                              )}
                              {row.storageType}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-medium text-white">
                            {row.totalGrossRequired} {row.baseUnit}
                          </td>
                          <td className="py-4 px-3 text-right font-mono text-gray-300">
                            {row.currentStock} {row.baseUnit}
                          </td>
                          <td className="py-4 px-3 text-right font-mono text-gray-400">
                            {row.minSafetyStock} {row.baseUnit}
                          </td>
                          <td className="py-4 px-3 text-right font-mono">
                            {row.isShortage ? (
                              <span className="text-rose-400 font-bold">
                                -{row.shortfallQuantity} {row.baseUnit}
                              </span>
                            ) : (
                              <span className="text-emerald-400">Sufficient</span>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center text-gray-300">
                            {row.packSize > 1 ? `${row.packSize} ${row.baseUnit}` : 'Loose'}
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-bold text-primary">
                            {row.suggestedOrderQty > 0 ? (
                              <div>
                                {row.suggestedOrderQty} {row.baseUnit}
                                {row.packSize > 1 && (
                                  <div className="text-[12px] text-gray-400 font-normal">
                                    ({row.bagCount} packs)
                                  </div>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-4 px-3 text-center">
                            <span
                              className={`font-mono text-xs ${
                                row.isUrgent
                                  ? 'text-rose-400 font-bold'
                                  : row.isWarning
                                  ? 'text-orange-400'
                                  : 'text-gray-300'
                              }`}
                            >
                              {new Date(row.orderByDate).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {row.isUrgent ? (
                              <span className="px-2 py-0.5 rounded-full text-[12px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                                ORDER TODAY
                              </span>
                            ) : row.isShortage ? (
                              <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-orange-500/10 text-orange-300 border border-orange-500/20">
                                SHORTAGE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                COVERED
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      {/* MODAL: Schedule Production Order */}
      <AnimatePresence>
        {showOrderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-lg p-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">Schedule Production Order</h3>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Select Finished Recipe *</label>
                  <select
                    required
                    value={newOrder.productName}
                    onChange={(e) => setNewOrder({ ...newOrder, productName: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Choose Recipe --</option>
                    {recipes.map((r) => (
                      <option key={r._id} value={r.productName}>
                        {r.productName} (Yield: {r.nominalBatchYieldPouches} pouches/batch)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Target Pouches to Produce *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 600"
                      value={newOrder.targetPouches}
                      onChange={(e) => setNewOrder({ ...newOrder, targetPouches: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Auto Calculated Batches</label>
                    <div className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-primary">
                      {calculatedBatches} batches
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Production Date *</label>
                    <input
                      type="date"
                      required
                      value={newOrder.productionDate}
                      onChange={(e) => setNewOrder({ ...newOrder, productionDate: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Priority</label>
                    <select
                      value={newOrder.priority}
                      onChange={(e) => setNewOrder({ ...newOrder, priority: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    >
                      <option value="NORMAL">Normal Schedule</option>
                      <option value="URGENT">Urgent / Rush Order</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Notes / Batch Remarks</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Dynamic mini order requested by buyer"
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowOrderModal(false)}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 text-sm"
                  >
                    Schedule & Recalculate MRP
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PurchasePlanner;
