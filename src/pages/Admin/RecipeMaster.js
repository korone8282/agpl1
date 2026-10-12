import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChefHat,
  Plus,
  Upload,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ThermometerSnowflake,
  Package,
  Layers,
  Sparkles,
  X,
  Trash2,
  ArrowLeft,
  Building2,
  Search,
  Pencil
} from 'lucide-react';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { INVENTORY_MRP_URL, CATEGORIES_URL, PRODUCT_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';

const format3Decimals = (val) => {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const RecipeMaster = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [buyersList, setBuyersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const [selectedBuyerFilter, setSelectedBuyerFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  // Excel Upload States
  const [uploadFile, setUploadFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Manual Recipe Creation Form
  const [newRecipe, setNewRecipe] = useState({
    buyerName: '',
    productName: '',
    nominalBatchYieldPouches: 250,
    batchCookedWeightKg: 0,
    packSizes: [],
    ingredients: [
      { materialName: '', edibleQuantity: '', unit: 'kg', lossFactor: 1.0, storageType: 'Ambient', notes: '' }
    ]
  });
  const [newPackSizeInput, setNewPackSizeInput] = useState('');

  // Edit Recipe Form
  const [editRecipeForm, setEditRecipeForm] = useState({
    buyerName: '',
    productName: '',
    nominalBatchYieldPouches: 250,
    batchCookedWeightKg: 0,
    packSizes: [],
    ingredients: []
  });
  const [editPackSizeInput, setEditPackSizeInput] = useState('');

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [res, catRes, prodRes] = await Promise.all([
        apiConnector(`${INVENTORY_MRP_URL}/recipes`, 'GET'),
        apiConnector(`${CATEGORIES_URL}/categories`, 'GET').catch(() => ({ data: { data: [] } })),
        apiConnector(`${PRODUCT_URL}/products`, 'GET').catch(() => ({ data: { data: [] } }))
      ]);

      if (res.data?.success) {
        setRecipes(res.data.data);
        if (res.data.data.length > 0 && !expandedRecipe) {
          setExpandedRecipe(res.data.data[0]._id);
        }
      }

      // Collect unique buyers from category endpoint and recipes
      const categoryBuyers = (catRes.data?.data || []).map((c) => c.name || c.buyerName).filter(Boolean);
      const recipeBuyers = res.data?.buyers || [];
      const combinedBuyers = Array.from(new Set([...categoryBuyers, ...recipeBuyers])).filter(Boolean);
      setBuyersList(combinedBuyers);

      if (prodRes.data?.data && Array.isArray(prodRes.data.data)) {
        setProductsList(prodRes.data.data);
      }
    } catch (err) {
      toast.error('Failed to load recipe data');
      console.error(err);
    } finally {
      setLoading(false);
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
      const res = await apiConnector(`${INVENTORY_MRP_URL}/recipes/import-excel`, 'POST', formData, {
        'Content-Type': 'multipart/form-data'
      });
      if (res.data?.success) {
        setPreviewData(res.data);
        toast.info(`Found ${res.data.recipes.length} recipe tabs in Excel. Review below.`);
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
    if (previewData && previewData.recipes) {
      formData.append('recipes', JSON.stringify(previewData.recipes));
    }

    try {
      setUploading(true);
      const res = await apiConnector(`${INVENTORY_MRP_URL}/recipes/import-excel`, 'POST', formData, {
        'Content-Type': 'multipart/form-data'
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Recipes successfully imported!');
        setShowUploadModal(false);
        setUploadFile(null);
        setPreviewData(null);
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to commit recipes');
    } finally {
      setUploading(false);
    }
  };

  const addIngredientRow = () => {
    setNewRecipe({
      ...newRecipe,
      ingredients: [
        ...newRecipe.ingredients,
        { materialName: '', edibleQuantity: '', unit: 'kg', lossFactor: 1.0, storageType: 'Ambient', notes: '' }
      ]
    });
  };

  const removeIngredientRow = (idx) => {
    const updated = newRecipe.ingredients.filter((_, i) => i !== idx);
    setNewRecipe({ ...newRecipe, ingredients: updated });
  };

  const updateIngredientRow = (idx, field, value) => {
    const updated = [...newRecipe.ingredients];
    updated[idx][field] = value;
    setNewRecipe({ ...newRecipe, ingredients: updated });
  };

  const handleAddPackSizeToNew = () => {
    const val = parseFloat(newPackSizeInput);
    if (!val || val <= 0) return;
    const normalized = val > 5 ? parseFloat((val / 1000).toFixed(4)) : parseFloat(val.toFixed(4));
    if (!newRecipe.packSizes.includes(normalized)) {
      setNewRecipe({ ...newRecipe, packSizes: [...newRecipe.packSizes, normalized] });
    }
    setNewPackSizeInput('');
  };

  const handleRemovePackSizeFromNew = (psToRemove) => {
    setNewRecipe({
      ...newRecipe,
      packSizes: newRecipe.packSizes.filter((ps) => ps !== psToRemove)
    });
  };

  const handleAddPackSizeToEdit = () => {
    const val = parseFloat(editPackSizeInput);
    if (!val || val <= 0) return;
    const normalized = val > 5 ? parseFloat((val / 1000).toFixed(4)) : parseFloat(val.toFixed(4));
    if (!editRecipeForm.packSizes.includes(normalized)) {
      setEditRecipeForm({ ...editRecipeForm, packSizes: [...editRecipeForm.packSizes, normalized] });
    }
    setEditPackSizeInput('');
  };

  const handleRemovePackSizeFromEdit = (psToRemove) => {
    setEditRecipeForm({
      ...editRecipeForm,
      packSizes: editRecipeForm.packSizes.filter((ps) => ps !== psToRemove)
    });
  };

  const handleOpenEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setEditRecipeForm({
      buyerName: recipe.buyerName || '',
      productName: recipe.productName || '',
      nominalBatchYieldPouches: recipe.nominalBatchYieldPouches || 250,
      batchCookedWeightKg: recipe.batchCookedWeightKg || 0,
      packSizes: Array.isArray(recipe.packSizes) ? [...recipe.packSizes] : [],
      ingredients: (recipe.ingredients || []).map((ing) => ({
        materialName: ing.materialName || '',
        edibleQuantity: ing.edibleQuantity || '',
        unit: ing.unit || 'kg',
        lossFactor: ing.lossFactor || 1.0,
        storageType: ing.storageType || 'Ambient',
        notes: ing.notes || ''
      }))
    });
    setEditPackSizeInput('');
    setShowEditModal(true);
  };

  const addEditIngredientRow = () => {
    setEditRecipeForm({
      ...editRecipeForm,
      ingredients: [
        ...editRecipeForm.ingredients,
        { materialName: '', edibleQuantity: '', unit: 'kg', lossFactor: 1.0, storageType: 'Ambient', notes: '' }
      ]
    });
  };

  const removeEditIngredientRow = (idx) => {
    const updated = editRecipeForm.ingredients.filter((_, i) => i !== idx);
    setEditRecipeForm({ ...editRecipeForm, ingredients: updated });
  };

  const updateEditIngredientRow = (idx, field, value) => {
    const updated = [...editRecipeForm.ingredients];
    updated[idx][field] = value;
    setEditRecipeForm({ ...editRecipeForm, ingredients: updated });
  };

  const handleUpdateRecipe = async (e) => {
    e.preventDefault();
    if (!editRecipeForm.productName) {
      toast.error('Product Name is required');
      return;
    }
    try {
      const payload = {
        ...editRecipeForm,
        buyerName: (editRecipeForm.buyerName || 'General').trim(),
        batchCookedWeightKg: Number(editRecipeForm.batchCookedWeightKg) || 0,
        packSizes: editRecipeForm.packSizes.map((p) => Number(p)).filter((p) => p > 0)
      };
      const res = await apiConnector(`${INVENTORY_MRP_URL}/recipes/${editingRecipe._id}`, 'PUT', payload);
      if (res.data?.success) {
        toast.success(`Recipe "${editRecipeForm.productName}" updated successfully!`);
        setShowEditModal(false);
        setEditingRecipe(null);
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating recipe');
    }
  };

  const handleCreateRecipe = async (e) => {
    e.preventDefault();
    if (!newRecipe.productName) {
      toast.error('Product Name is required');
      return;
    }
    try {
      const payload = {
        ...newRecipe,
        buyerName: (newRecipe.buyerName || 'General').trim(),
        batchCookedWeightKg: Number(newRecipe.batchCookedWeightKg) || 0,
        packSizes: newRecipe.packSizes.map((p) => Number(p)).filter((p) => p > 0)
      };
      const res = await apiConnector(`${INVENTORY_MRP_URL}/recipes`, 'POST', payload);
      if (res.data?.success) {
        toast.success(`Recipe "${newRecipe.productName}" created!`);
        setShowCreateModal(false);
        setNewRecipe({
          buyerName: '',
          productName: '',
          nominalBatchYieldPouches: 250,
          batchCookedWeightKg: 0,
          packSizes: [],
          ingredients: [
            { materialName: '', edibleQuantity: '', unit: 'kg', lossFactor: 1.0, storageType: 'Ambient', notes: '' }
          ]
        });
        setNewPackSizeInput('');
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating recipe');
    }
  };

  // Filter recipes by buyer and search
  const filteredRecipes = recipes.filter((r) => {
    const matchesBuyer = selectedBuyerFilter === 'ALL' || (r.buyerName || 'General') === selectedBuyerFilter;
    const matchesSearch =
      !searchTerm ||
      r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.buyerName && r.buyerName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesBuyer && matchesSearch;
  });

  // Unique buyers from loaded recipes
  const uniqueBuyersInRecipes = Array.from(new Set(recipes.map((r) => r.buyerName || 'General')));

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
            <ChefHat className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Recipe Master & Bill of Materials (BOM)</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Organized by Buyer & Finished Products — standard batch yields, edible kettle quantities & prep loss factors
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 transition-all text-sm shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Create Recipe
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-all text-sm"
          >
            <Upload className="w-4 h-4 text-primary" />
            Upload Multi-Tab Excel
          </button>
        </div>
      </div>

      {/* Loss Factor Info Banner */}
      <div className="bg-gradient-to-r from-orange-950/30 to-amber-950/20 border border-orange-500/20 rounded-2xl p-5 mb-8 backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-orange-300">Buyer Master & Automated Loss Calculation</h4>
            <p className="text-xs text-gray-300 mt-0.5">
              Each BOM is categorized under its respective Buyer. When issuing materials or running MRP,
              the engine calculates: <span className="font-mono text-primary">Gross Qty = Edible Qty × Loss Factor × Batches</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Buyer Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedBuyerFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              selectedBuyerFilter === 'ALL'
                ? 'bg-primary text-black font-semibold shadow-md shadow-primary/20'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            All Buyers ({recipes.length})
          </button>
          {uniqueBuyersInRecipes.map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBuyerFilter(b)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedBuyerFilter === b
                  ? 'bg-primary text-black font-semibold shadow-md shadow-primary/20'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {b} ({recipes.filter((r) => (r.buyerName || 'General') === b).length})
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search product or buyer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary w-52"
          />
        </div>
      </div>

      {/* Recipes Accordion List */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader />
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="bg-secondary/10 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
          <ChefHat className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <p className="text-lg font-medium text-gray-300">No recipes found</p>
          <p className="text-sm mt-1 text-gray-500">
            {selectedBuyerFilter !== 'ALL'
              ? `No recipes registered under buyer "${selectedBuyerFilter}".`
              : 'Upload your multi-tab Excel workbook or click "Create Recipe" above to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecipes.map((recipe) => {
            const isExpanded = expandedRecipe === recipe._id;
            return (
              <div
                key={recipe._id}
                className="bg-secondary/10 border border-white/10 hover:border-white/20 transition-all rounded-2xl overflow-hidden backdrop-blur-sm"
              >
                {/* Recipe Card Header */}
                <div
                  onClick={() => setExpandedRecipe(isExpanded ? null : recipe._id)}
                  className="p-5 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/15 text-primary border border-primary/30">
                          <Building2 className="w-3 h-3" />
                          {recipe.buyerName || 'General'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white">{recipe.productName}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                        {recipe.batchCookedWeightKg > 0 && (
                          <span>
                            Cooked Wt: <strong className="text-white font-mono">{recipe.batchCookedWeightKg} kg</strong>
                          </span>
                        )}
                        {recipe.packSizes && recipe.packSizes.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-gray-400">Pack Sizes:</span>
                            {recipe.packSizes.map((ps, pIdx) => {
                              const yieldP =
                                recipe.batchCookedWeightKg > 0
                                  ? Math.round(recipe.batchCookedWeightKg / ps)
                                  : recipe.nominalBatchYieldPouches;
                              return (
                                <span
                                  key={pIdx}
                                  className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-mono text-[11px]"
                                >
                                  {ps >= 1 ? `${ps}kg` : `${Math.round(ps * 1000)}g`} ({ps}kg) → {yieldP} p/batch
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span>
                            Yield: <strong className="text-primary font-mono">{recipe.nominalBatchYieldPouches}</strong> pouches/batch
                          </span>
                        )}
                        <span>• {recipe.ingredients?.length || 0} Ingredients</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditRecipe(recipe);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-primary transition-all text-xs font-semibold"
                      title="Edit Recipe & Pack Sizes"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Ingredients Table */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-white/10 bg-black/40 p-5"
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                              <th className="py-2.5 px-3">#</th>
                              <th className="py-2.5 px-3">Ingredient Name</th>
                              <th className="py-2.5 px-3">Storage</th>
                              <th className="py-2.5 px-3 text-right">Edible Kettle Qty</th>
                              <th className="py-2.5 px-3 text-center">Prep Loss Factor</th>
                              <th className="py-2.5 px-3 text-right text-primary font-bold">Gross Warehouse Req.</th>
                              <th className="py-2.5 px-3">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono">
                            {recipe.ingredients.map((ing, idx) => {
                              const edible = Number(ing.edibleQuantity) || 0;
                              const factor = Number(ing.lossFactor) || 1.0;
                              const gross = edible * factor;
                              return (
                                <tr key={idx} className="hover:bg-white/5">
                                  <td className="py-2.5 px-3 text-gray-500 font-sans">{idx + 1}</td>
                                  <td className="py-2.5 px-3 font-sans font-medium text-white">{ing.materialName}</td>
                                  <td className="py-2.5 px-3 font-sans">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                        ing.storageType === 'Cold'
                                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                      }`}
                                    >
                                      {ing.storageType === 'Cold' ? (
                                        <ThermometerSnowflake className="w-2.5 h-2.5" />
                                      ) : (
                                        <Package className="w-2.5 h-2.5" />
                                      )}
                                      {ing.storageType}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-gray-300">
                                    {format3Decimals(edible)} {ing.unit}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span
                                      className={`px-1.5 py-0.5 rounded ${
                                        factor > 1.05
                                          ? 'bg-orange-500/20 text-orange-300'
                                          : 'bg-white/5 text-gray-400'
                                      }`}
                                    >
                                      {format3Decimals(factor)}x
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-primary font-bold">
                                    {format3Decimals(gross)} {ing.unit}
                                  </td>
                                  <td className="py-2.5 px-3 font-sans text-gray-500 text-[11px]">{ing.notes || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Upload Multi-Tab Excel */}
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
                  <h3 className="text-lg font-bold">Upload Multi-Tab Recipe Workbook</h3>
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
                  <p className="text-sm font-medium text-white mb-1">Choose your Recipe Master Excel file</p>
                  <p className="text-xs text-gray-400 mb-4">
                    Supports sheets with Buyer Name, Product Name, Nominal Yield, and loss formulas (e.g. 0.442*1.01)
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
                        Parsed Recipe Tabs ({previewData.recipes.length} Products Found)
                      </span>
                    </div>

                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {previewData.recipes.map((r, idx) => (
                        <div key={idx} className="bg-black/50 p-3 rounded-xl border border-white/10 text-xs">
                          <div className="flex items-center justify-between font-bold text-white mb-1">
                            <span>
                              {r.productName} <span className="text-primary font-normal">({r.buyerName || 'General'})</span>
                            </span>
                            <span className="text-gray-400">
                              Yield: {r.nominalBatchYieldPouches}p | {r.ingredients.length} items
                            </span>
                          </div>
                          <div className="text-gray-400 truncate">
                            {r.ingredients.map((i) => i.materialName).join(', ')}
                          </div>
                        </div>
                      ))}
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
                    Confirm & Save All Recipes to DB
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Create Recipe Manually */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">Create New Recipe Master</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRecipe} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Buyer Name *</label>
                    <input
                      type="text"
                      required
                      list="buyer-options"
                      placeholder="e.g. Gits / Haldiram"
                      value={newRecipe.buyerName}
                      onChange={(e) => setNewRecipe({ ...newRecipe, buyerName: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                    <datalist id="buyer-options">
                      {buyersList.map((b, idx) => (
                        <option key={idx} value={b} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Product Name *</label>
                    <input
                      type="text"
                      required
                      list="product-options"
                      placeholder="e.g. Rajma Masala 300g"
                      value={newRecipe.productName}
                      onChange={(e) => setNewRecipe({ ...newRecipe, productName: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                    <datalist id="product-options">
                      {productsList.map((p, idx) => (
                        <option key={idx} value={p.name || p.productName || p.title} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Batch Cooked Weight / Total Yield (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      placeholder="e.g. 70"
                      value={newRecipe.batchCookedWeightKg || ''}
                      onChange={(e) =>
                        setNewRecipe({ ...newRecipe, batchCookedWeightKg: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Pack Sizes & Dynamic Pouches Per Batch Section */}
                <div className="border border-white/10 rounded-xl p-3 bg-black/40">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Pack Sizes (kg) & Calculated Pouches per Batch
                    </label>
                    <span className="text-[11px] text-gray-400">
                      Pouches per Batch = Cooked Weight ÷ Pack Size
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="e.g. 0.16 or 0.2 (in kg)"
                      value={newPackSizeInput}
                      onChange={(e) => setNewPackSizeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPackSizeToNew();
                        }
                      }}
                      className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary w-52"
                    />
                    <button
                      type="button"
                      onClick={handleAddPackSizeToNew}
                      className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-xs font-semibold"
                    >
                      + Add Pack Size
                    </button>
                  </div>

                  {newRecipe.packSizes.length === 0 ? (
                    <div className="text-xs text-gray-500 italic">
                      No specific pack sizes added yet. Enter pack size above (e.g. 0.16kg or 0.2kg).
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {newRecipe.packSizes.map((ps, idx) => {
                        const calculatedPouches =
                          newRecipe.batchCookedWeightKg > 0
                            ? (newRecipe.batchCookedWeightKg / ps).toFixed(1)
                            : '—';
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-white text-xs font-mono"
                          >
                            <span className="text-primary font-bold">{ps} kg</span>
                            <span className="text-gray-400">
                              ({ps >= 1 ? `${ps}kg` : `${Math.round(ps * 1000)}g`})
                            </span>
                            <span className="text-gray-300 font-sans">→</span>
                            <span className="text-white font-bold">{calculatedPouches} pouches/batch</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePackSizeFromNew(ps)}
                              className="ml-1 text-gray-400 hover:text-rose-400"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Ingredients Sub-form */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Recipe Ingredients & Prep Loss Factors
                    </span>
                    <button
                      type="button"
                      onClick={addIngredientRow}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Ingredient Row
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {newRecipe.ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 bg-black/50 p-2.5 rounded-xl border border-white/10 items-center"
                      >
                        <div className="col-span-4">
                          <input
                            type="text"
                            required
                            placeholder="Material Name (e.g. Onion)"
                            value={ing.materialName}
                            onChange={(e) => updateIngredientRow(idx, 'materialName', e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.001"
                            required
                            placeholder="Edible Qty"
                            value={ing.edibleQuantity}
                            onChange={(e) => updateIngredientRow(idx, 'edibleQuantity', e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.001"
                            placeholder="Loss (e.g. 1.176)"
                            value={ing.lossFactor}
                            onChange={(e) => updateIngredientRow(idx, 'lossFactor', e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="col-span-3">
                          <select
                            value={ing.storageType}
                            onChange={(e) => updateIngredientRow(idx, 'storageType', e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="Ambient">Ambient</option>
                            <option value="Cold">Cold Storage</option>
                          </select>
                        </div>
                        <div className="col-span-1 text-center">
                          {newRecipe.ingredients.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeIngredientRow(idx)}
                              className="text-gray-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 text-sm"
                  >
                    Save Recipe Master
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Edit Recipe Master */}
      <AnimatePresence>
        {showEditModal && editingRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">Edit Recipe Master & Pack Sizes</h3>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRecipe(null);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateRecipe} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Buyer Name *</label>
                    <input
                      type="text"
                      required
                      list="buyer-options"
                      placeholder="e.g. Gits / Haldiram"
                      value={editRecipeForm.buyerName}
                      onChange={(e) => setEditRecipeForm({ ...editRecipeForm, buyerName: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Product Name *</label>
                    <input
                      type="text"
                      required
                      list="product-options"
                      placeholder="e.g. Rajma Masala 300g"
                      value={editRecipeForm.productName}
                      onChange={(e) => setEditRecipeForm({ ...editRecipeForm, productName: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Batch Cooked Weight / Total Yield (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      placeholder="e.g. 70"
                      value={editRecipeForm.batchCookedWeightKg || ''}
                      onChange={(e) =>
                        setEditRecipeForm({
                          ...editRecipeForm,
                          batchCookedWeightKg: parseFloat(e.target.value) || 0
                        })
                      }
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Pack Sizes & Dynamic Pouches Per Batch Section */}
                <div className="border border-white/10 rounded-xl p-3 bg-black/40">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Pack Sizes (kg) & Calculated Pouches per Batch
                    </label>
                    <span className="text-[11px] text-gray-400">
                      Pouches per Batch = Cooked Weight ÷ Pack Size
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="e.g. 0.16 or 0.2 (in kg)"
                      value={editPackSizeInput}
                      onChange={(e) => setEditPackSizeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPackSizeToEdit();
                        }
                      }}
                      className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary w-52"
                    />
                    <button
                      type="button"
                      onClick={handleAddPackSizeToEdit}
                      className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-xs font-semibold"
                    >
                      + Add Pack Size
                    </button>
                  </div>

                  {editRecipeForm.packSizes.length === 0 ? (
                    <div className="text-xs text-gray-500 italic">
                      No specific pack sizes added yet. Enter pack size above (e.g. 0.16kg or 0.2kg).
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {editRecipeForm.packSizes.map((ps, idx) => {
                        const calculatedPouches =
                          editRecipeForm.batchCookedWeightKg > 0
                            ? (editRecipeForm.batchCookedWeightKg / ps).toFixed(1)
                            : '—';
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-white text-xs font-mono"
                          >
                            <span className="text-primary font-bold">{ps} kg</span>
                            <span className="text-gray-400">
                              ({ps >= 1 ? `${ps}kg` : `${Math.round(ps * 1000)}g`})
                            </span>
                            <span className="text-gray-300 font-sans">→</span>
                            <span className="text-white font-bold">{calculatedPouches} pouches/batch</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePackSizeFromEdit(ps)}
                              className="ml-1 text-gray-400 hover:text-rose-400"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Ingredients Sub-form */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Recipe Ingredients & Prep Loss Factors
                    </span>
                    <button
                      type="button"
                      onClick={addEditIngredientRow}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Ingredient Row
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {editRecipeForm.ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 bg-black/50 p-2.5 rounded-xl border border-white/10 items-center"
                      >
                        <div className="col-span-4">
                          <input
                            type="text"
                            required
                            placeholder="Material Name (e.g. Onion)"
                            value={ing.materialName}
                            onChange={(e) => updateEditIngredientRow(idx, 'materialName', e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.001"
                            required
                            placeholder="Edible Qty"
                            value={ing.edibleQuantity}
                            onChange={(e) => updateEditIngredientRow(idx, 'edibleQuantity', e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.001"
                            placeholder="Loss (e.g. 1.176)"
                            value={ing.lossFactor}
                            onChange={(e) => updateEditIngredientRow(idx, 'lossFactor', e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="col-span-3">
                          <select
                            value={ing.storageType}
                            onChange={(e) => updateEditIngredientRow(idx, 'storageType', e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="Ambient">Ambient</option>
                            <option value="Cold">Cold Storage</option>
                          </select>
                        </div>
                        <div className="col-span-1 text-center">
                          {editRecipeForm.ingredients.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEditIngredientRow(idx)}
                              className="text-gray-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingRecipe(null);
                    }}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 text-sm"
                  >
                    Update Recipe Master
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

export default RecipeMaster;
