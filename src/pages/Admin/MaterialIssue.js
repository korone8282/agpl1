import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  CheckCircle2,
  History,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { INVENTORY_MRP_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';

const MaterialIssue = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [issues, setIssues] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [issueItems, setIssueItems] = useState([]);
  const [kitchenSupervisor, setKitchenSupervisor] = useState('Kitchen Supervisor');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [orderRes, issueRes] = await Promise.all([
        apiConnector(`${INVENTORY_MRP_URL}/production-orders?status=PLANNED`, 'GET'),
        apiConnector(`${INVENTORY_MRP_URL}/material-issues`, 'GET')
      ]);

      if (orderRes.data?.success) setOrders(orderRes.data.data);
      if (issueRes.data?.success) setIssues(issueRes.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load material issue data');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = (orderId) => {
    setSelectedOrderId(orderId);
    if (!orderId) {
      setIssueItems([]);
      return;
    }

    const order = orders.find((o) => o._id === orderId);
    if (!order) return;

    // Aggregate requirements across recipes in this order
    const aggregated = [];

    order.items.forEach((item) => {
      const recipe = item.recipe;
      if (!recipe || !recipe.ingredients) return;

      const batches = item.batches;

      recipe.ingredients.forEach((ing) => {
        let unitMultiplier = 1;
        if (ing.unit === 'g' || ing.unit === 'gm') unitMultiplier = 0.001;
        if (ing.unit === 'ml') unitMultiplier = 0.001;

        const theoreticalGross = parseFloat((ing.edibleQuantity * unitMultiplier * (ing.lossFactor || 1.0) * batches).toFixed(3));

        aggregated.push({
          rawMaterialId: ing.rawMaterial,
          materialName: ing.materialName,
          theoreticalEdibleQty: ing.edibleQuantity * batches,
          lossFactor: ing.lossFactor || 1.0,
          theoreticalGrossQty: theoreticalGross,
          actualIssuedQty: theoreticalGross, // Default to theoretical gross
          unit: ing.unit === 'g' ? 'kg' : (ing.unit === 'ml' ? 'L' : ing.unit),
          varianceQty: 0,
          variancePercent: 0
        });
      });
    });

    setIssueItems(aggregated);
  };

  const handleActualQtyChange = (idx, value) => {
    const updated = [...issueItems];
    const valNum = parseFloat(value) || 0;
    updated[idx].actualIssuedQty = valNum;

    const theo = updated[idx].theoreticalGrossQty;
    const diff = parseFloat((valNum - theo).toFixed(3));
    const pct = theo > 0 ? parseFloat(((diff / theo) * 100).toFixed(2)) : 0;

    updated[idx].varianceQty = diff;
    updated[idx].variancePercent = pct;
    setIssueItems(updated);
  };

  const handleConfirmIssue = async (e) => {
    e.preventDefault();
    if (!selectedOrderId || issueItems.length === 0) {
      toast.error('Please select an active order with ingredients');
      return;
    }

    try {
      setIssuing(true);
      const payload = {
        productionOrderId: selectedOrderId,
        kitchenSupervisor,
        items: issueItems,
        notes
      };

      const res = await apiConnector(`${INVENTORY_MRP_URL}/material-issues`, 'POST', payload);
      if (res.data?.success) {
        toast.success(`Materials successfully issued to kitchen!`);
        setSelectedOrderId('');
        setIssueItems([]);
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
              <h1 className="text-3xl font-bold tracking-tight">Kitchen Store Issue & Variance Tracker</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Hand off prep ingredients to kitchen kettles, track physical variances vs theoretical recipe BOM
            </p>
          </div>
        </div>

        {/* Issue Material Form */}
        <div className="bg-secondary/15 border border-white/10 rounded-2xl p-6 lg:p-8 mb-10 backdrop-blur-sm">
          <form onSubmit={handleConfirmIssue} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Select Planned Production Order *</label>
                <select
                  required
                  value={selectedOrderId}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose Production Order --</option>
                  {orders.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.orderNumber} ({new Date(o.productionDate).toLocaleDateString()}) - {o.items.map((i) => `${i.productName} (${i.batches}b)`).join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Kitchen Supervisor Name</label>
                <input
                  type="text"
                  value={kitchenSupervisor}
                  onChange={(e) => setKitchenSupervisor(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
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

            {/* Theoretical vs Actual Table */}
            {issueItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Ingredient Verification & Variance
                  </span>
                  <span className="text-xs text-gray-400">
                    Gross recipe requirements calculated with peeling factors
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
                        <th className="py-3 px-4 text-right font-bold text-white">Actual Issued Qty</th>
                        <th className="py-3 px-4 text-right">Variance Qty</th>
                        <th className="py-3 px-4 text-center">Variance (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {issueItems.map((item, idx) => {
                        const isOver = item.varianceQty > 0;
                        const isUnder = item.varianceQty < 0;
                        return (
                          <tr key={idx} className="hover:bg-white/5">
                            <td className="py-3 px-4 font-medium text-white">{item.materialName}</td>
                            <td className="py-3 px-4 text-right font-mono text-gray-300">
                              {item.theoreticalEdibleQty.toFixed(2)} {item.unit}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-orange-400">
                              {item.lossFactor}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-gray-200">
                              {item.theoreticalGrossQty} {item.unit}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <input
                                type="number"
                                step="any"
                                required
                                value={item.actualIssuedQty}
                                onChange={(e) => handleActualQtyChange(idx, e.target.value)}
                                className="w-28 bg-black border border-primary/50 text-right rounded-lg px-2.5 py-1 text-xs text-primary font-mono font-bold"
                              />
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold">
                              {isOver ? (
                                <span className="text-orange-400">+{item.varianceQty}</span>
                              ) : isUnder ? (
                                <span className="text-emerald-400">{item.varianceQty}</span>
                              ) : (
                                <span className="text-gray-400">0.00</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono">
                              {Math.abs(item.variancePercent) > 0 ? (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[12px] ${
                                    Math.abs(item.variancePercent) > 5
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : 'bg-orange-500/10 text-orange-300'
                                  }`}
                                >
                                  {item.variancePercent > 0 ? `+${item.variancePercent}%` : `${item.variancePercent}%`}
                                </span>
                              ) : (
                                <span className="text-emerald-400 text-[12px]">Exact (0%)</span>
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
            Kitchen Material Issue History & Physical Variance Log
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
                      <th className="py-3 px-4">Issue No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Production Order</th>
                      <th className="py-3 px-4">Supervisor</th>
                      <th className="py-3 px-4 text-center">Items Handed Over</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {issues.map((iss) => (
                      <tr key={iss._id} className="hover:bg-white/5">
                        <td className="py-3 px-4 font-mono font-bold text-primary">{iss.issueNumber}</td>
                        <td className="py-3 px-4 text-gray-300">{new Date(iss.issueDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-mono text-gray-300">
                          {iss.productionOrder?.orderNumber || 'Direct Issue'}
                        </td>
                        <td className="py-3 px-4 text-white">{iss.kitchenSupervisor || 'Supervisor'}</td>
                        <td className="py-3 px-4 text-center font-bold text-gray-200">
                          {iss.items?.length || 0} Materials
                        </td>
                        <td className="py-3 px-4 text-gray-400">{iss.notes || '—'}</td>
                      </tr>
                    ))}
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
