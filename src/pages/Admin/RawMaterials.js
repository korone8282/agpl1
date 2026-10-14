import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  ThermometerSnowflake,
  Package,
  AlertTriangle,
  Plus,
  Upload,
  SlidersHorizontal,
  History,
  Search,
  X,
  FileSpreadsheet,
  ArrowLeft,
  Clock,
  Calendar
} from 'lucide-react';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { INVENTORY_MRP_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg (Kilograms)' },
  { value: 'L', label: 'L (Liters)' },
  { value: 'pcs', label: 'pcs (Pieces)' },
  { value: 'tin', label: 'tin (Tins)' },
  { value: 'can', label: 'can (Cans)' },
  { value: 'box', label: 'box (Boxes)' },
  { value: 'packet', label: 'packet (Packets / Pouches)' },
  { value: 'bottle', label: 'bottle (Bottles)' },
  { value: 'jar', label: 'jar (Jars)' },
  { value: 'bag', label: 'bag (Bags / Sacks)' },
  { value: 'carton', label: 'carton (Cartons)' },
  { value: 'roll', label: 'roll (Rolls)' },
  { value: 'bundle', label: 'bundle (Bundles)' },
  { value: 'g', label: 'g (Grams)' },
  { value: 'ml', label: 'ml (Milliliters)' },
  { value: 'custom', label: '+ Other / Custom Unit...' }
];

const format3Decimals = (val) => {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const RawMaterials = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, Cold, Ambient, LOW_STOCK
  const [search, setSearch] = useState('');

  // History Modal View State (PURCHASE, FEFO, USAGE)
  const [historyTab, setHistoryTab] = useState('PURCHASE');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materialDetails, setMaterialDetails] = useState(null);

  // Form states
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [customUnit, setCustomUnit] = useState('');
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    storageType: 'Ambient',
    baseUnit: 'kg',
    currentStock: 0,
    leadTimeDays: 1
  });

  const [adjustment, setAdjustment] = useState({
    rawMaterialId: '',
    adjustmentType: 'WRITE_OFF',
    quantity: '',
    reason: '',
    createdBy: 'Store In-charge'
  });

  // Excel Upload States
  const [uploadFile, setUploadFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await apiConnector(`${INVENTORY_MRP_URL}/raw-materials`, 'GET');
      if (res.data?.success) {
        setMaterials(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load raw materials');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    if (!newMaterial.name) {
      toast.error('Material name is required');
      return;
    }
    const finalUnit = (isCustomUnit ? customUnit : newMaterial.baseUnit)?.trim();
    if (!finalUnit) {
      toast.error('Base unit is required');
      return;
    }
    try {
      const payload = {
        ...newMaterial,
        baseUnit: finalUnit
      };
      const res = await apiConnector(`${INVENTORY_MRP_URL}/raw-materials`, 'POST', payload);
      if (res.data?.success) {
        toast.success(`Raw material "${newMaterial.name}" created!`);
        setShowAddModal(false);
        setIsCustomUnit(false);
        setCustomUnit('');
        setNewMaterial({
          name: '',
          storageType: 'Ambient',
          baseUnit: 'kg',
          currentStock: 0,
          leadTimeDays: 1
        });
        fetchMaterials();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating material');
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustment.rawMaterialId || !adjustment.quantity) {
      toast.error('Material and quantity are required');
      return;
    }
    try {
      const res = await apiConnector(`${INVENTORY_MRP_URL}/ledger/adjust`, 'POST', adjustment);
      if (res.data?.success) {
        toast.success('Stock adjusted successfully');
        setShowAdjustModal(false);
        setAdjustment({
          rawMaterialId: '',
          adjustmentType: 'WRITE_OFF',
          quantity: '',
          reason: '',
          createdBy: 'Store In-charge'
        });
        fetchMaterials();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Adjustment failed');
    }
  };

  const handleExcelPreview = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('preview', 'true');

    try {
      setUploading(true);
      const res = await apiConnector(`${INVENTORY_MRP_URL}/stock/import-opening`, 'POST', formData, {
        'Content-Type': 'multipart/form-data'
      });
      if (res.data?.success) {
        setPreviewData(res.data.data);
        toast.info(`Parsed ${res.data.data.length} items from Excel. Review below.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse Excel file');
    } finally {
      setUploading(false);
    }
  };

  const handleCommitExcel = async () => {
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('preview', 'false');

    try {
      setUploading(true);
      const res = await apiConnector(`${INVENTORY_MRP_URL}/stock/import-opening`, 'POST', formData, {
        'Content-Type': 'multipart/form-data'
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Opening stock successfully imported!');
        setShowUploadModal(false);
        setUploadFile(null);
        setPreviewData(null);
        fetchMaterials();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const openHistoryModal = async (mat) => {
    setSelectedMaterial(mat);
    setShowHistoryModal(true);
    setMaterialDetails(null);
    try {
      const detailRes = await apiConnector(`${INVENTORY_MRP_URL}/raw-materials/${mat._id}`, 'GET');
      if (detailRes.data?.success) {
        setMaterialDetails(detailRes.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load history details');
    }
  };

  // Filter materials
  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.code && m.code.toLowerCase().includes(search.toLowerCase())) ||
      (m.preferredSupplier && m.preferredSupplier.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'Cold') return m.storageType === 'Cold';
    if (activeTab === 'Ambient') return m.storageType === 'Ambient';
    if (activeTab === 'LOW_STOCK') return m.currentStock <= 0;
    if (activeTab === 'FEFO') return m.fefoStatus === 'CRITICAL' || m.fefoStatus === 'EXPIRING_SOON' || m.fefoStatus === 'EXPIRED';
    return true;
  });

  const coldCount = materials.filter((m) => m.storageType === 'Cold').length;
  const ambientCount = materials.filter((m) => m.storageType === 'Ambient').length;
  const lowStockCount = materials.filter((m) => m.currentStock <= 0).length;
  const fefoCount = materials.filter((m) => m.fefoStatus === 'CRITICAL' || m.fefoStatus === 'EXPIRING_SOON' || m.fefoStatus === 'EXPIRED').length;

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

      {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <Boxes className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Raw Material Inventory Ledger</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Live warehouse stock, Cold vs. Ambient segregation, expiry tracking & procurement rates
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 transition-all text-sm shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Add Material
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-all text-sm"
            >
              <Upload className="w-4 h-4 text-primary" />
              Import Opening Stock
            </button>

            <button
              onClick={() => setShowAdjustModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-all text-sm"
            >
              <SlidersHorizontal className="w-4 h-4 text-orange-400" />
              Stock Adjustment
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-secondary/20 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Raw Materials</span>
              <Boxes className="w-5 h-5 text-primary" />
            </div>
            <div className="text-2xl font-bold">{materials.length}</div>
            <div className="text-xs text-gray-400 mt-1">Catalog items tracked</div>
          </div>

          <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-cyan-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Cold Storage</span>
              <ThermometerSnowflake className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-cyan-300">{coldCount}</div>
            <div className="text-xs text-gray-400 mt-1">Perishables & Dairy (2-6°C)</div>
          </div>

          <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Ambient Storage</span>
              <Package className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-amber-300">{ambientCount}</div>
            <div className="text-xs text-gray-400 mt-1">Grains, Spices & Dry Staples</div>
          </div>

          <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-rose-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Out of Stock</span>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-rose-300">{lowStockCount}</div>
            <div className="text-xs text-gray-400 mt-1">Zero or negative stock items</div>
          </div>

          <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">FEFO Attention</span>
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-purple-300">{fefoCount}</div>
            <div className="text-xs text-gray-400 mt-1">Expiring ≤30d / expired</div>
          </div>
        </div>

        {/* Filters & Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-xl border border-white/10 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'ALL' ? 'bg-primary text-black font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              All Items ({materials.length})
            </button>
            <button
              onClick={() => setActiveTab('Cold')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'Cold' ? 'bg-cyan-500 text-black font-semibold' : 'text-cyan-400 hover:text-cyan-300'
              }`}
            >
              <ThermometerSnowflake className="w-3.5 h-3.5" />
              Cold Storage ({coldCount})
            </button>
            <button
              onClick={() => setActiveTab('Ambient')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'Ambient' ? 'bg-amber-500 text-black font-semibold' : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Ambient ({ambientCount})
            </button>
            <button
              onClick={() => setActiveTab('LOW_STOCK')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'LOW_STOCK' ? 'bg-rose-500 text-black font-semibold' : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Out of Stock ({lowStockCount})
            </button>
            <button
              onClick={() => setActiveTab('FEFO')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'FEFO' ? 'bg-purple-500 text-black font-semibold' : 'text-purple-400 hover:text-purple-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              FEFO Priority ({fefoCount})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ingredient, code, supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-secondary/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {/* Live Inventory Table */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader />
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="bg-secondary/10 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
            <Boxes className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-lg font-medium text-gray-300">No raw materials found</p>
            <p className="text-sm mt-1 text-gray-500">
              {search ? 'Try clearing your search query' : 'Import your opening stock or add ingredients to get started'}
            </p>
          </div>
        ) : (
          <div className="bg-secondary/10 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Material Name</th>
                    <th className="py-4 px-4">Storage</th>
                    <th className="py-4 px-4 text-right">Current Stock</th>
                    <th className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        Expiry / FEFO
                      </span>
                    </th>
                    <th className="py-4 px-4 text-right">Last Rate</th>
                    <th className="py-4 px-4 text-right">Avg Rate</th>
                    <th className="py-4 px-4 text-center">Lead Time</th>
                    <th className="py-4 px-6 text-center">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredMaterials.map((m) => {
                    return (
                      <tr key={m._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 font-medium text-white">{m.name}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              m.storageType === 'Cold'
                                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            }`}
                          >
                            {m.storageType === 'Cold' ? (
                              <ThermometerSnowflake className="w-3 h-3" />
                            ) : (
                              <Package className="w-3 h-3" />
                            )}
                            {m.storageType}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-semibold text-white">
                          {format3Decimals(m.currentStock)} <span className="text-gray-400 text-xs font-normal">{m.baseUnit}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {m.earliestExpiryDate ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-mono text-xs text-white">
                                {new Date(m.earliestExpiryDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                              {m.fefoStatus === 'EXPIRED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                                  EXPIRED ({Math.abs(m.daysUntilExpiry)}d ago)
                                </span>
                              )}
                              {m.fefoStatus === 'CRITICAL' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                                  FEFO PRIORITY ({m.daysUntilExpiry}d left)
                                </span>
                              )}
                              {m.fefoStatus === 'EXPIRING_SOON' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  EXPIRING SOON ({m.daysUntilExpiry}d left)
                                </span>
                              )}
                              {m.fefoStatus === 'SAFE' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                  FEFO SAFE ({m.daysUntilExpiry}d left)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="text-gray-500 text-xs">—</span>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-gray-400 bg-white/5 border border-white/10 mt-0.5">
                                Non-perishable
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-white">
                          ₹{m.lastPurchaseRate > 0 ? format3Decimals(m.lastPurchaseRate) : '—'}
                          <span className="text-gray-500 text-xs font-normal">/{m.baseUnit}</span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-gray-300">
                          ₹{m.averagePurchaseRate > 0 ? format3Decimals(m.averagePurchaseRate) : '—'}
                          <span className="text-gray-500 text-xs font-normal">/{m.baseUnit}</span>
                        </td>
                        <td className="py-4 px-4 text-center text-gray-300 text-xs">
                          {format3Decimals(m.leadTimeDays)} {m.leadTimeDays === 1 ? 'day' : 'days'}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            type="button"
                            onClick={() => openHistoryModal(m)}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="Open History Modal (Purchase Log, FEFO Rank, Usage Records)"
                          >
                            <History className="w-4 h-4 text-primary" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* MODAL 1: Add Raw Material */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">Add New Raw Material</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateMaterial} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Material Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Onion, Tomato Puree, Fresh Cream"
                    value={newMaterial.name}
                    onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Storage Type</label>
                    <select
                      value={newMaterial.storageType}
                      onChange={(e) => setNewMaterial({ ...newMaterial, storageType: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    >
                      <option value="Ambient">Ambient (Dry Staples)</option>
                      <option value="Cold">Cold Storage (Perishable/Dairy)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Base Unit</label>
                    <select
                      value={isCustomUnit ? 'custom' : newMaterial.baseUnit}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setIsCustomUnit(true);
                        } else {
                          setIsCustomUnit(false);
                          setNewMaterial({ ...newMaterial, baseUnit: val });
                        }
                      }}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    >
                      {UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {isCustomUnit && (
                      <input
                        type="text"
                        required
                        placeholder="Type unit (e.g. tin, roll, drum)"
                        value={customUnit}
                        onChange={(e) => {
                          setCustomUnit(e.target.value);
                          setNewMaterial({ ...newMaterial, baseUnit: e.target.value });
                        }}
                        className="mt-2 w-full bg-black border border-primary/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                        autoFocus
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Opening Stock</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0"
                      value={newMaterial.currentStock}
                      onChange={(e) => setNewMaterial({ ...newMaterial, currentStock: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Lead Time (Days)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={newMaterial.leadTimeDays}
                      onChange={(e) => setNewMaterial({ ...newMaterial, leadTimeDays: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl text-[11px] text-zinc-400 font-mono">
                  💡 Other details like supplier, purchase rates, batches & expiry dates will be recorded through GRN (Goods Receipt Note) only.
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 text-sm shadow-lg shadow-primary/20"
                  >
                    Save Material
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Excel Import Opening Stock */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">Import Day-1 Opening Stock Balances</h3>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="border-2 border-dashed border-white/20 hover:border-primary/50 transition-colors rounded-2xl p-6 text-center">
                  <Upload className="w-10 h-10 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium text-white mb-1">Choose your Opening Stock Excel Workbook</p>
                  <p className="text-xs text-gray-400 mb-1">Supports .xlsx and .xls format</p>
                  <p className="text-[12px] text-primary/90 mb-4">
                    Accepts all units: kg, L, pcs, tin, can, box, packet, bottle, jar, bag, carton or any custom unit
                  </p>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelPreview}
                    className="block mx-auto text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-black hover:file:bg-primary/90"
                  />
                </div>

                {uploading && (
                  <div className="py-6 flex justify-center">
                    <Loader />
                  </div>
                )}

                {previewData && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Preview Parsed Rows ({previewData.length} Items)
                      </span>
                      <span className="text-xs text-gray-400">Review before confirming</span>
                    </div>

                    <div className="bg-black/50 border border-white/10 rounded-xl overflow-x-auto max-h-64">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/10 text-gray-400">
                            <th className="p-2.5">Item Name</th>
                            <th className="p-2.5">Storage</th>
                            <th className="p-2.5 text-right">Opening Stock</th>
                            <th className="p-2.5 text-right">Rate (₹)</th>
                            <th className="p-2.5">Expiry</th>
                            <th className="p-2.5 text-center">Lead Days</th>
                            <th className="p-2.5 text-center">Pack Size</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {previewData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/5">
                              <td className="p-2.5 font-medium text-white">{item.name}</td>
                              <td className="p-2.5 text-gray-300">{item.storageType}</td>
                              <td className="p-2.5 text-right font-mono text-primary">
                                {format3Decimals(item.openingStock)} {item.unit}
                              </td>
                              <td className="p-2.5 text-right font-mono text-gray-300">₹{format3Decimals(item.rate)}</td>
                              <td className="p-2.5 text-gray-400">
                                {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}
                              </td>
                              <td className="p-2.5 text-center text-gray-300">{format3Decimals(item.leadTimeDays)}d</td>
                              <td className="p-2.5 text-center text-gray-300">{format3Decimals(item.packSize)} {item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!previewData || uploading}
                    onClick={handleCommitExcel}
                    className="px-5 py-2 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 disabled:opacity-50 text-sm"
                  >
                    Confirm & Save to Database
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Stock Adjustment */}
      <AnimatePresence>
        {showAdjustModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-bold">Manual Stock Adjustment</h3>
                </div>
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdjustStock} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Select Raw Material *</label>
                  <select
                    required
                    value={adjustment.rawMaterialId}
                    onChange={(e) => setAdjustment({ ...adjustment, rawMaterialId: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Choose Ingredient --</option>
                    {materials.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} (Current: {format3Decimals(m.currentStock)} {m.baseUnit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Adjustment Type</label>
                  <select
                    value={adjustment.adjustmentType}
                    onChange={(e) => setAdjustment({ ...adjustment, adjustmentType: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="WRITE_OFF">Write-Off (Spoilage, Damage, Cutting Waste)</option>
                    <option value="AUDIT_CORRECTION">Audit Correction (+ or -)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Quantity * {(() => {
                      const sel = materials.find((m) => m._id === adjustment.rawMaterialId);
                      return sel ? `(${sel.baseUnit})` : '';
                    })()}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="Enter quantity"
                    value={adjustment.quantity}
                    onChange={(e) => setAdjustment({ ...adjustment, quantity: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Reason / Notes</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. 5 tin puree spoiled or 10 pcs damaged during storage"
                    value={adjustment.reason}
                    onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-orange-500 text-black font-semibold hover:bg-orange-400 text-sm"
                  >
                    Apply Adjustment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Price History & Ledger */}
      <AnimatePresence>
        {showHistoryModal && selectedMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-4xl h-[85vh] max-h-[750px] min-h-[520px] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header & Top Stat Cards */}
              <div className="p-6 pb-4 border-b border-white/10 shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white font-mono">{selectedMaterial.name}</h3>
                    <p className="text-xs text-gray-400">
                      Storage: {selectedMaterial.storageType} | Current Stock: {format3Decimals(selectedMaterial.currentStock)} {selectedMaterial.baseUnit}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-black/50 p-3.5 rounded-xl border border-white/10">
                    <span className="text-xs text-gray-400 uppercase">Last Purchase Rate</span>
                    <div className="text-lg font-bold font-mono text-primary mt-1">
                      ₹{format3Decimals(selectedMaterial.lastPurchaseRate)} / {selectedMaterial.baseUnit}
                    </div>
                  </div>
                  <div className="bg-black/50 p-3.5 rounded-xl border border-white/10">
                    <span className="text-xs text-gray-400 uppercase">Average Purchase Rate</span>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                      ₹{format3Decimals(selectedMaterial.averagePurchaseRate)} / {selectedMaterial.baseUnit}
                    </div>
                  </div>
                  <div className="bg-black/50 p-3.5 rounded-xl border border-white/10">
                    <span className="text-xs text-gray-400 uppercase">Earliest Expiry</span>
                    <div className="text-sm font-bold font-mono text-white mt-1">
                      {selectedMaterial.earliestExpiryDate
                        ? new Date(selectedMaterial.earliestExpiryDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : 'Non-dated'}
                    </div>
                    {selectedMaterial.fefoStatus && selectedMaterial.fefoStatus !== 'NO_EXPIRY' && (
                      <span className="text-[11px] text-gray-400">
                        Status: {selectedMaterial.fefoStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Sub-Tabs */}
              <div className="px-6 pt-4 pb-2 shrink-0">
                <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-xl border border-white/10 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setHistoryTab('PURCHASE')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      historyTab === 'PURCHASE'
                        ? 'bg-primary text-black font-bold shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>1. Purchase History Log</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      historyTab === 'PURCHASE' ? 'bg-black/20 text-black font-bold' : 'bg-white/10 text-gray-300'
                    }`}>
                      {materialDetails?.purchaseHistory?.length ?? 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistoryTab('FEFO')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      historyTab === 'FEFO'
                        ? 'bg-purple-500 text-black font-bold shadow-md'
                        : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>2. FEFO Rank</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      historyTab === 'FEFO' ? 'bg-black/20 text-black font-bold' : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {materialDetails?.activeLots?.length ?? 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistoryTab('USAGE')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      historyTab === 'USAGE'
                        ? 'bg-emerald-400 text-black font-bold shadow-md'
                        : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>3. Usage Records</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      historyTab === 'USAGE' ? 'bg-black/20 text-black font-bold' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {materialDetails?.usageRecords?.length ?? 0}
                    </span>
                  </button>
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
                {!materialDetails ? (
                  <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-3 bg-black/40 border border-white/5 rounded-xl">
                    <Loader />
                    <p className="text-xs text-gray-400">Loading history records...</p>
                  </div>
                ) : (
                  <>
                  {/* 1. PURCHASE HISTORY LOG */}
                  {historyTab === 'PURCHASE' && (
                    <div>
                  {(!materialDetails?.purchaseHistory || materialDetails.purchaseHistory.length === 0) ? (
                    <div className="py-12 text-center bg-black/40 border border-white/5 rounded-xl">
                      <FileSpreadsheet className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">
                        No previous purchase history or GRN entries recorded for this material.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                              <th className="p-3">Date</th>
                              <th className="p-3 text-right">Quantity</th>
                              <th className="p-3 text-right">Rate</th>
                              <th className="p-3 text-right">Cost</th>
                              <th className="p-3">Vendor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {materialDetails.purchaseHistory.map((p, idx) => (
                              <tr key={p._id || idx} className="hover:bg-white/5">
                                <td className="p-3 text-gray-300 font-mono">
                                  {new Date(p.date).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-white">
                                  {format3Decimals(p.quantity)} <span className="text-gray-400 text-xs font-normal">{p.unit || selectedMaterial.baseUnit}</span>
                                </td>
                                <td className="p-3 text-right font-mono font-semibold text-primary">
                                  ₹{format3Decimals(p.rate)}
                                  <span className="text-gray-500 text-[11px] font-normal">/{p.unit || selectedMaterial.baseUnit}</span>
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                  ₹{format3Decimals(p.cost || (p.quantity * p.rate))}
                                </td>
                                <td className="p-3 text-gray-200">
                                  <span className="font-medium">{p.vendor || selectedMaterial.preferredSupplier || '—'}</span>
                                  {p.grnNumber && p.grnNumber !== '—' && (
                                    <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                                      {p.grnNumber}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. FEFO RANK */}
              {historyTab === 'FEFO' && (
                <div>
                  {(!materialDetails?.activeLots || materialDetails.activeLots.length === 0) ? (
                    <div className="py-12 text-center bg-black/40 border border-white/5 rounded-xl">
                      <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">
                        No active inward batch lots in the FEFO priority queue.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                              <th className="p-3">FEFO Rank</th>
                              <th className="p-3">Batch / Lot</th>
                              <th className="p-3">Date</th>
                              <th className="p-3">Expiry Date</th>
                              <th className="p-3 text-right">Qty Inward</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {materialDetails.activeLots.map((lot, idx) => (
                              <tr key={lot._id || idx} className="hover:bg-white/5">
                                <td className="p-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                    idx === 0 ? 'bg-primary text-black font-semibold' : 'bg-white/10 text-gray-300'
                                  }`}>
                                    #{idx + 1} {idx === 0 ? 'DISPATCH FIRST' : ''}
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-gray-300">
                                  {lot.lotNumber || lot.grnNumber || lot.transactionType}
                                </td>
                                <td className="p-3 text-gray-400">
                                  {new Date(lot.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-3 font-mono">
                                  {lot.expiryDate ? (
                                    <span className={new Date(lot.expiryDate) < new Date() ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                                      {new Date(lot.expiryDate).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">Non-dated</span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-mono font-semibold text-white">
                                  {format3Decimals(lot.quantity)} {lot.unit || selectedMaterial.baseUnit}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. USAGE RECORDS */}
              {historyTab === 'USAGE' && (
                <div>
                  {(!materialDetails?.usageRecords || materialDetails.usageRecords.length === 0) ? (
                    <div className="py-12 text-center bg-black/40 border border-white/5 rounded-xl">
                      <History className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">
                        No kitchen store usage records logged for this material yet.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                              <th className="p-3">Date</th>
                              <th className="p-3">Recipe Name</th>
                              <th className="p-3 text-right">Opening Balance</th>
                              <th className="p-3 text-right">Used Qty</th>
                              <th className="p-3 text-right">Closing Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {materialDetails.usageRecords.map((rec, idx) => (
                              <tr key={rec._id || idx} className="hover:bg-white/5">
                                <td className="p-3 font-mono text-gray-300">
                                  {new Date(rec.date).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </td>
                                <td className="p-3 font-medium text-white">
                                  {rec.recipeName || 'Recipe Issue'}
                                  {rec.batches && rec.batches !== 1 && (
                                    <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">
                                      {rec.batches} b
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-mono font-semibold text-cyan-300">
                                  {rec.openingBalance !== null && rec.openingBalance !== undefined
                                    ? `${format3Decimals(rec.openingBalance)} ${rec.unit || selectedMaterial.baseUnit}`
                                    : '—'}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-primary">
                                  - {format3Decimals(rec.usedQty)} {rec.unit || selectedMaterial.baseUnit}
                                </td>
                                <td className="p-3 text-right font-mono font-semibold text-emerald-400">
                                  {rec.closingBalance !== null && rec.closingBalance !== undefined
                                    ? `${format3Decimals(rec.closingBalance)} ${rec.unit || selectedMaterial.baseUnit}`
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
                </>
              )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RawMaterials;
