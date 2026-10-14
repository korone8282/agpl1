import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
  ArrowLeft,
  Search,
  Edit2,
  AlertTriangle,
  X
} from 'lucide-react';
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

const GoodsReceipt = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Edit / Delete GRN Audit Trail States
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({
    rawMaterialId: '',
    quantity: '',
    rate: '',
    lotNumber: '',
    expiryDate: '',
    vendor: '',
    reason: '',
    grnNumber: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deletingEntry, setDeletingEntry] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // GRN Form State
  const [grnForm, setGrnForm] = useState({
    grnNumber: '',
    vendorInvoiceNumber: '',
    vendorName: '',
    receivedDate: new Date().toISOString().split('T')[0],
    items: [
      { rawMaterialId: '', quantityReceived: '', purchaseRate: '', lotNumber: '', expiryDate: '' }
    ]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [matRes, ledgerRes] = await Promise.all([
        apiConnector(`${INVENTORY_MRP_URL}/raw-materials`, 'GET'),
        apiConnector(`${INVENTORY_MRP_URL}/ledger?transactionType=GRN&limit=100`, 'GET')
      ]);

      if (matRes.data?.success) setMaterials(matRes.data.data);
      if (ledgerRes.data?.success) setLedgerEntries(ledgerRes.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load GRN data');
    } finally {
      setLoading(false);
    }
  };

  const addItemRow = () => {
    setGrnForm({
      ...grnForm,
      items: [
        ...grnForm.items,
        { rawMaterialId: '', quantityReceived: '', purchaseRate: '', lotNumber: '', expiryDate: '' }
      ]
    });
  };

  const removeItemRow = (idx) => {
    const updated = grnForm.items.filter((_, i) => i !== idx);
    setGrnForm({ ...grnForm, items: updated });
  };

  const updateItemRow = (idx, field, value) => {
    const updated = [...grnForm.items];
    updated[idx][field] = value;
    setGrnForm({ ...grnForm, items: updated });
  };

  const handleSubmitGRN = async (e) => {
    e.preventDefault();
    if (!grnForm.vendorName) {
      toast.error('Vendor name is required');
      return;
    }

    const invalid = grnForm.items.some((it) => !it.rawMaterialId || !it.quantityReceived || !it.purchaseRate);
    if (invalid) {
      toast.error('All item rows must have material, quantity, and rate');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiConnector(`${INVENTORY_MRP_URL}/grn`, 'POST', grnForm);
      if (res.data?.success) {
        toast.success(res.data.message || 'GRN logged and warehouse stock updated!');
        setGrnForm({
          grnNumber: '',
          vendorInvoiceNumber: '',
          vendorName: '',
          receivedDate: new Date().toISOString().split('T')[0],
          items: [
            { rawMaterialId: '', quantityReceived: '', purchaseRate: '', lotNumber: '', expiryDate: '' }
          ]
        });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record GRN');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (entry) => {
    setEditingEntry(entry);
    setEditForm({
      rawMaterialId: entry.rawMaterial?._id || entry.rawMaterial || '',
      quantity: entry.quantity !== undefined ? entry.quantity : '',
      rate: entry.rate !== undefined ? entry.rate : '',
      lotNumber: entry.lotNumber || '',
      expiryDate: entry.expiryDate ? new Date(entry.expiryDate).toISOString().split('T')[0] : '',
      vendor: entry.vendor || '',
      reason: entry.reason || '',
      grnNumber: entry.grnNumber || ''
    });
  };

  const handleCloseEditModal = () => {
    setEditingEntry(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingEntry) return;

    const qty = Number(editForm.quantity);
    const rate = Number(editForm.rate);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid positive quantity');
      return;
    }
    if (isNaN(rate) || rate < 0) {
      toast.error('Please enter a valid purchase rate');
      return;
    }

    try {
      setEditSubmitting(true);
      const res = await apiConnector(
        `${INVENTORY_MRP_URL}/grn/${editingEntry._id}`,
        'PUT',
        {
          ...editForm,
          quantity: qty,
          rate: rate
        }
      );
      if (res.data?.success) {
        toast.success(res.data.message || 'GRN audit trail entry updated successfully');
        setEditingEntry(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update GRN entry');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (entry) => {
    setDeletingEntry(entry);
  };

  const handleCloseDeleteModal = () => {
    setDeletingEntry(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEntry) return;
    try {
      setDeleteSubmitting(true);
      const res = await apiConnector(
        `${INVENTORY_MRP_URL}/grn/${deletingEntry._id}`,
        'DELETE'
      );
      if (res.data?.success) {
        toast.success(res.data.message || 'GRN entry deleted and warehouse stock reverted');
        setDeletingEntry(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete GRN entry');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const filteredEntries = ledgerEntries.filter((entry) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (entry.grnNumber && entry.grnNumber.toLowerCase().includes(q)) ||
      (entry.materialName && entry.materialName.toLowerCase().includes(q)) ||
      (entry.lotNumber && entry.lotNumber.toLowerCase().includes(q)) ||
      (entry.reason && entry.reason.toLowerCase().includes(q)) ||
      (entry.unit && entry.unit.toLowerCase().includes(q))
    );
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
              <Truck className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Goods Receipt Note (GRN) Inward Entry</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Log incoming raw material shipments with vendor rates, lot tracking, and expiry dates
            </p>
          </div>
        </div>

        {/* GRN Creation Form Card */}
        <div className="bg-secondary/15 border border-white/10 rounded-2xl p-6 lg:p-8 mb-10 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Record New Material Inward (GRN)</h2>
          </div>

          <form onSubmit={handleSubmitGRN} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">GRN Number (Optional)</label>
                <input
                  type="text"
                  placeholder="Auto-generated if blank"
                  value={grnForm.grnNumber}
                  onChange={(e) => setGrnForm({ ...grnForm, grnNumber: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Vendor Invoice Number</label>
                <input
                  type="text"
                  placeholder="e.g. INV-8921"
                  value={grnForm.vendorInvoiceNumber}
                  onChange={(e) => setGrnForm({ ...grnForm, vendorInvoiceNumber: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Vendor / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Local Mandi / Amul / Tata"
                  value={grnForm.vendorName}
                  onChange={(e) => setGrnForm({ ...grnForm, vendorName: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Received Date *</label>
                <input
                  type="date"
                  required
                  value={grnForm.receivedDate}
                  onChange={(e) => setGrnForm({ ...grnForm, receivedDate: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Inward Items Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Inward Materials & Purchase Prices
                </span>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Material Row
                </button>
              </div>

              <div className="space-y-3">
                {grnForm.items.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-black/40 p-3 rounded-xl border border-white/10 items-center"
                  >
                    <div className="md:col-span-4">
                      <select
                        required
                        value={row.rawMaterialId}
                        onChange={(e) => updateItemRow(idx, 'rawMaterialId', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        <option value="">-- Choose Raw Material --</option>
                        {materials.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.name} ({m.storageType} - {m.baseUnit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <input
                        type="number"
                        step="0.001"
                        required
                        placeholder="Quantity"
                        value={row.quantityReceived}
                        onChange={(e) => updateItemRow(idx, 'quantityReceived', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <input
                        type="number"
                        step="0.001"
                        required
                        placeholder="Rate (₹/unit)"
                        value={row.purchaseRate}
                        onChange={(e) => updateItemRow(idx, 'purchaseRate', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <input
                        type="text"
                        placeholder="Lot / Batch No"
                        value={row.lotNumber}
                        onChange={(e) => updateItemRow(idx, 'lotNumber', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <input
                        type="date"
                        title="Expiry Date"
                        value={row.expiryDate}
                        onChange={(e) => updateItemRow(idx, 'expiryDate', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[13px] text-white"
                      />
                    </div>

                    <div className="md:col-span-1 text-center">
                      {grnForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 disabled:opacity-50 text-sm shadow-lg shadow-primary/20"
              >
                {submitting ? 'Recording GRN...' : 'Submit GRN & Update Live Stock'}
              </button>
            </div>
          </form>
        </div>

        {/* Recent GRN History Table */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Recent Inward Shipments (GRN Audit Trail)
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Audit trail of all recorded GRN receipts and live stock updates
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative min-w-[220px] sm:min-w-[280px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search GRN, material, lot, vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-gray-400 hover:text-white underline font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader />
            </div>
          ) : ledgerEntries.length === 0 ? (
            <div className="bg-secondary/10 border border-white/10 rounded-2xl p-8 text-center text-gray-400 text-sm">
              No recent GRN receipts logged yet.
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-secondary/10 border border-white/10 rounded-2xl p-8 text-center text-gray-400 text-sm">
              No inward shipments found matching &quot;{searchTerm}&quot;.
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="block mx-auto mt-2 text-xs text-emerald-400 hover:underline font-semibold"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <div className="bg-secondary/10 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">GRN No</th>
                      <th className="py-3 px-4">Material</th>
                      <th className="py-3 px-4 text-right">Inward Qty</th>
                      <th className="py-3 px-4 text-right">Purchase Rate</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4">Lot No</th>
                      <th className="py-3 px-4">Expiry Date</th>
                      <th className="py-3 px-4">Supplier / Reason</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredEntries.map((entry) => (
                      <tr key={entry._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300">{new Date(entry.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-mono font-bold text-primary">{entry.grnNumber || '—'}</td>
                        <td className="py-3 px-4 font-medium text-white">{entry.materialName}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          +{format3Decimals(entry.quantity)} {entry.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-white">₹{format3Decimals(entry.rate)}</td>
                        <td className="py-3 px-4 text-right font-mono text-gray-300">
                          ₹{format3Decimals(entry.totalAmount)}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400">{entry.lotNumber || '—'}</td>
                        <td className="py-3 px-4 text-gray-400">
                          {entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-400">{entry.reason || '—'}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(entry)}
                              title="Edit GRN Entry"
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModal(entry)}
                              title="Delete GRN Entry"
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      {/* Edit GRN Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111111] border border-white/15 rounded-2xl p-6 w-full max-w-xl shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Update GRN Audit Trail Entry</h3>
                  <p className="text-xs text-gray-400 font-mono">GRN: {editingEntry.grnNumber || '—'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Raw Material *</label>
                <select
                  value={editForm.rawMaterialId}
                  onChange={(e) => setEditForm({ ...editForm, rawMaterialId: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
                >
                  {materials.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.storageType} - {m.baseUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">GRN Number</label>
                  <input
                    type="text"
                    value={editForm.grnNumber}
                    onChange={(e) => setEditForm({ ...editForm, grnNumber: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Lot / Batch No</label>
                  <input
                    type="text"
                    value={editForm.lotNumber}
                    onChange={(e) => setEditForm({ ...editForm, lotNumber: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Inward Quantity ({editingEntry.unit || 'units'}) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Purchase Rate (₹/unit) *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={editForm.rate}
                    onChange={(e) => setEditForm({ ...editForm, rate: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={editForm.expiryDate}
                    onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Supplier / Vendor</label>
                  <input
                    type="text"
                    value={editForm.vendor}
                    onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 text-xs text-gray-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>Calculated Total Amount:</span>
                  <span className="font-mono font-bold text-white">
                    ₹{format3Decimals((Number(editForm.quantity) || 0) * (Number(editForm.rate) || 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                  <span>Original Qty: {format3Decimals(editingEntry.quantity)} {editingEntry.unit}</span>
                  <span>
                    Net Stock Change:{' '}
                    <strong
                      className={
                        (Number(editForm.quantity) || 0) - Number(editingEntry.quantity) >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }
                    >
                      {(Number(editForm.quantity) || 0) - Number(editingEntry.quantity) >= 0 ? '+' : ''}
                      {format3Decimals((Number(editForm.quantity) || 0) - Number(editingEntry.quantity))} {editingEntry.unit}
                    </strong>
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 italic">
                  * Live inventory current stock will be automatically synchronized with this change.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={editSubmitting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-black hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  {editSubmitting ? 'Saving Changes...' : 'Save & Synchronize Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-white/15 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete GRN Entry?</h3>
                <p className="text-xs text-gray-400 font-mono">
                  GRN No: <span className="text-primary font-semibold">{deletingEntry.grnNumber || '—'}</span>
                </p>
              </div>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>Material:</span>
                <span className="font-semibold text-white">{deletingEntry.materialName}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Inward Qty:</span>
                <span className="font-mono font-bold text-rose-400">
                  -{format3Decimals(deletingEntry.quantity)} {deletingEntry.unit}
                </span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Purchase Rate:</span>
                <span className="font-mono text-white">₹{format3Decimals(deletingEntry.rate)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Supplier / Reason:</span>
                <span className="text-gray-300">{deletingEntry.reason || deletingEntry.vendor || '—'}</span>
              </div>
            </div>

            <div className="text-xs text-rose-300/90 leading-relaxed bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
              ⚠️ <strong>Stock Reversal Warning:</strong> Deleting this entry will undo the inward stock addition (-{format3Decimals(deletingEntry.quantity)} {deletingEntry.unit}) from warehouse inventory and permanently delete this audit record.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={deleteSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
              >
                {deleteSubmitting ? 'Deleting...' : 'Confirm Delete & Undo Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  );
};

export default GoodsReceipt;
