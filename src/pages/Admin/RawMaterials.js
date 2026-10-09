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
  CheckCircle2,
  X,
  FileSpreadsheet,
  ArrowLeft
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

const RawMaterials = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, Cold, Ambient, LOW_STOCK
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [priceHistory, setPriceHistory] = useState(null);

  // Form states
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [customUnit, setCustomUnit] = useState('');
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    code: '',
    storageType: 'Ambient',
    baseUnit: 'kg',
    currentStock: 0,
    minSafetyStock: 0,
    leadTimeDays: 1,
    packSize: 1,
    preferredSupplier: '',
    lastPurchaseRate: 0
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
          code: '',
          storageType: 'Ambient',
          baseUnit: 'kg',
          currentStock: 0,
          minSafetyStock: 0,
          leadTimeDays: 1,
          packSize: 1,
          preferredSupplier: '',
          lastPurchaseRate: 0
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

  const openPriceHistory = async (mat) => {
    setSelectedMaterial(mat);
    setShowHistoryModal(true);
    try {
      const res = await apiConnector(`${INVENTORY_MRP_URL}/price-trends/${mat._id}`, 'GET');
      if (res.data?.success) {
        setPriceHistory(res.data);
      }
    } catch (err) {
      console.error(err);
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
    if (activeTab === 'LOW_STOCK') return m.currentStock <= m.minSafetyStock;
    return true;
  });

  const coldCount = materials.filter((m) => m.storageType === 'Cold').length;
  const ambientCount = materials.filter((m) => m.storageType === 'Ambient').length;
  const lowStockCount = materials.filter((m) => m.currentStock <= m.minSafetyStock).length;

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
              Live warehouse stock, Cold vs. Ambient segregation, safety thresholds & procurement rates
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <span className="text-xs font-semibold uppercase tracking-wider">Low Stock Alerts</span>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-rose-300">{lowStockCount}</div>
            <div className="text-xs text-gray-400 mt-1">At or below safety buffer</div>
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
              Low Stock ({lowStockCount})
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
                    <th className="py-4 px-4">Code</th>
                    <th className="py-4 px-4">Storage</th>
                    <th className="py-4 px-4 text-right">Current Stock</th>
                    <th className="py-4 px-4 text-right">Safety Buffer</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-right">Last Rate</th>
                    <th className="py-4 px-4 text-center">Pack Size</th>
                    <th className="py-4 px-4 text-center">Lead Time</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredMaterials.map((m) => {
                    const isLow = m.currentStock <= m.minSafetyStock;
                    return (
                      <tr key={m._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 font-medium text-white">{m.name}</td>
                        <td className="py-4 px-4 text-gray-400 font-mono text-xs">{m.code || '—'}</td>
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
                          {m.currentStock.toLocaleString()} <span className="text-gray-400 text-xs font-normal">{m.baseUnit}</span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-gray-400">
                          {m.minSafetyStock} <span className="text-xs">{m.baseUnit}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Healthy
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-white">
                          ₹{m.lastPurchaseRate > 0 ? m.lastPurchaseRate.toFixed(2) : '—'}
                          <span className="text-gray-500 text-xs font-normal">/{m.baseUnit}</span>
                        </td>
                        <td className="py-4 px-4 text-center text-gray-300 text-xs">
                          {m.packSize > 1 ? `${m.packSize} ${m.baseUnit}/pack` : 'Loose'}
                        </td>
                        <td className="py-4 px-4 text-center text-gray-300 text-xs">
                          {m.leadTimeDays} {m.leadTimeDays === 1 ? 'day' : 'days'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => openPriceHistory(m)}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="View Price Trend & Ledger"
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
                    <label className="block text-xs font-medium text-gray-300 mb-1">Item Code</label>
                    <input
                      type="text"
                      placeholder="e.g. RM-VEG-001"
                      value={newMaterial.code}
                      onChange={(e) => setNewMaterial({ ...newMaterial, code: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
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
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Opening Stock</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={newMaterial.currentStock}
                      onChange={(e) => setNewMaterial({ ...newMaterial, currentStock: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Safety Stock</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="50"
                      value={newMaterial.minSafetyStock}
                      onChange={(e) => setNewMaterial({ ...newMaterial, minSafetyStock: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Lead Time (Days)</label>
                    <input
                      type="number"
                      placeholder="1"
                      value={newMaterial.leadTimeDays}
                      onChange={(e) => setNewMaterial({ ...newMaterial, leadTimeDays: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Pack Size ({newMaterial.baseUnit || 'unit'}/pack)
                    </label>
                    <input
                      type="number"
                      placeholder="25"
                      value={newMaterial.packSize}
                      onChange={(e) => setNewMaterial({ ...newMaterial, packSize: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Purchase Rate (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={newMaterial.lastPurchaseRate}
                      onChange={(e) => setNewMaterial({ ...newMaterial, lastPurchaseRate: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Preferred Supplier</label>
                    <input
                      type="text"
                      placeholder="e.g. Mandi / Amul / MDH"
                      value={newMaterial.preferredSupplier}
                      onChange={(e) => setNewMaterial({ ...newMaterial, preferredSupplier: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
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
                    className="px-5 py-2 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 text-sm"
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
                                {item.openingStock} {item.unit}
                              </td>
                              <td className="p-2.5 text-right font-mono text-gray-300">₹{item.rate}</td>
                              <td className="p-2.5 text-gray-400">
                                {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}
                              </td>
                              <td className="p-2.5 text-center text-gray-300">{item.leadTimeDays}d</td>
                              <td className="p-2.5 text-center text-gray-300">{item.packSize} {item.unit}</td>
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
                        {m.name} (Current: {m.currentStock} {m.baseUnit})
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
                    step="any"
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedMaterial.name}</h3>
                  <p className="text-xs text-gray-400">
                    Storage: {selectedMaterial.storageType} | Current Stock: {selectedMaterial.currentStock} {selectedMaterial.baseUnit}
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/50 p-4 rounded-xl border border-white/10">
                  <span className="text-xs text-gray-400 uppercase">Last Purchase Rate</span>
                  <div className="text-xl font-bold font-mono text-primary mt-1">
                    ₹{selectedMaterial.lastPurchaseRate.toFixed(2)} / {selectedMaterial.baseUnit}
                  </div>
                </div>
                <div className="bg-black/50 p-4 rounded-xl border border-white/10">
                  <span className="text-xs text-gray-400 uppercase">Average Purchase Rate</span>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    ₹{selectedMaterial.averagePurchaseRate.toFixed(2)} / {selectedMaterial.baseUnit}
                  </div>
                </div>
              </div>

              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Purchase Price History Log
              </h4>

              {priceHistory && priceHistory.history && priceHistory.history.length > 0 ? (
                <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-gray-400">
                        <th className="p-3">Date</th>
                        <th className="p-3">Rate (₹)</th>
                        <th className="p-3">GRN Number</th>
                        <th className="p-3">Vendor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {priceHistory.history.map((h, i) => (
                        <tr key={i} className="hover:bg-white/5">
                          <td className="p-3 text-gray-300">{new Date(h.date).toLocaleDateString()}</td>
                          <td className="p-3 font-mono font-semibold text-primary">₹{h.rate.toFixed(2)}</td>
                          <td className="p-3 font-mono text-gray-400">{h.grnNumber || '—'}</td>
                          <td className="p-3 text-gray-300">{h.vendor || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic text-center py-4">
                  No previous GRN price entries recorded yet.
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RawMaterials;
