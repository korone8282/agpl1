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
  ArrowLeft
} from 'lucide-react';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { INVENTORY_MRP_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';

const RecipeMaster = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecipe, setExpandedRecipe] = useState(null);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Excel Upload States
  const [uploadFile, setUploadFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Manual Recipe Creation Form
  const [newRecipe, setNewRecipe] = useState({
    productName: '',
    nominalBatchYieldPouches: 250,
    batchCookedWeightKg: 0,
    ingredients: [
      { materialName: '', edibleQuantity: '', unit: 'kg', lossFactor: 1.0, storageType: 'Ambient', notes: '' }
    ]
  });

  useEffect(() => {
    fetchRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const res = await apiConnector(`${INVENTORY_MRP_URL}/recipes`, 'GET');
      if (res.data?.success) {
        setRecipes(res.data.data);
        if (res.data.data.length > 0 && !expandedRecipe) {
          setExpandedRecipe(res.data.data[0]._id);
        }
      }
    } catch (err) {
      toast.error('Failed to load recipes');
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
        fetchRecipes();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
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

  const handleCreateRecipe = async (e) => {
    e.preventDefault();
    if (!newRecipe.productName) {
      toast.error('Product Name is required');
      return;
    }
    try {
      const res = await apiConnector(`${INVENTORY_MRP_URL}/recipes`, 'POST', newRecipe);
      if (res.data?.success) {
        toast.success(`Recipe "${newRecipe.productName}" created!`);
        setShowCreateModal(false);
        setNewRecipe({
          productName: '',
          nominalBatchYieldPouches: 250,
          batchCookedWeightKg: 0,
          ingredients: [
            { materialName: '', edibleQuantity: '', unit: 'kg', lossFactor: 1.0, storageType: 'Ambient', notes: '' }
          ]
        });
        fetchRecipes();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating recipe');
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

      {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <ChefHat className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Recipe Master & Bill of Materials (BOM)</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Standard batch yields, edible kettle quantities & prep/peeling loss factors for automated gross ordering
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
              <h4 className="text-sm font-bold text-orange-300">Automated Peeling & Cooking Loss Calculation</h4>
              <p className="text-xs text-gray-300 mt-0.5">
                For ingredients with peeling or cutting loss (e.g. 100kg raw onion yields 85kg edible, factor = 1.176),
                the MRP engine automatically multiplies: <span className="font-mono text-primary">Gross Qty = Edible Qty × Loss Factor × Batches</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Recipes Accordion List */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader />
          </div>
        ) : recipes.length === 0 ? (
          <div className="bg-secondary/10 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
            <ChefHat className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-lg font-medium text-gray-300">No recipes registered yet</p>
            <p className="text-sm mt-1 text-gray-500">
              Upload your multi-tab Excel workbook or click "Create Recipe" above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recipes.map((recipe) => {
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
                        <h3 className="text-lg font-bold text-white">{recipe.productName}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span>
                            Yield: <strong className="text-primary font-mono">{recipe.nominalBatchYieldPouches}</strong> pouches/batch
                          </span>
                          {recipe.batchCookedWeightKg > 0 && (
                            <span>
                              • Cooked Weight: <strong className="text-white font-mono">{recipe.batchCookedWeightKg} kg</strong>
                            </span>
                          )}
                          <span>• {recipe.ingredients?.length || 0} Ingredients</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
                        Batch Scale: 1.0x
                      </span>
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
                        className="border-t border-white/10 bg-black/40 px-6 py-5"
                      >
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                                <th className="py-3 px-3">Ingredient</th>
                                <th className="py-3 px-3">Code</th>
                                <th className="py-3 px-3">Storage</th>
                                <th className="py-3 px-3 text-right">Edible Kettle Qty</th>
                                <th className="py-3 px-3 text-right">Prep Loss Factor</th>
                                <th className="py-3 px-3 text-right">Gross Store Required</th>
                                <th className="py-3 px-4">Stage / Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {recipe.ingredients.map((ing, idx) => {
                                const gross = (ing.edibleQuantity * (ing.lossFactor || 1.0)).toFixed(2);
                                return (
                                  <tr key={idx} className="hover:bg-white/5">
                                    <td className="py-3 px-3 font-medium text-white">{ing.materialName}</td>
                                    <td className="py-3 px-3 text-gray-400 font-mono">{ing.materialCode || '—'}</td>
                                    <td className="py-3 px-3">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-medium border ${
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
                                    <td className="py-3 px-3 text-right font-mono text-gray-300">
                                      {ing.edibleQuantity} {ing.unit}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-orange-400">
                                      {ing.lossFactor && ing.lossFactor > 1.0 ? ing.lossFactor : '1.0 (No loss)'}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-bold text-primary">
                                      {gross} {ing.unit}
                                    </td>
                                    <td className="py-3 px-4 text-gray-400 italic">{ing.notes || '—'}</td>
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

      {/* MODAL: Multi-Tab Excel Uploader */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto"
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
                  <p className="text-sm font-medium text-white mb-1">
                    Select your Multi-Tab Excel Workbook (e.g. Recipes_Master.xlsx)
                  </p>
                  <p className="text-xs text-gray-400 mb-4">Each sheet represents one finished recipe product</p>
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
                        Parsed {previewData.recipes.length} Recipe Sheets
                      </span>
                      <span className="text-xs text-gray-400">Preview before saving</span>
                    </div>

                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {previewData.recipes.map((rec, i) => (
                        <div key={i} className="bg-black/50 border border-white/10 rounded-xl p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 font-semibold uppercase">Product:</span>
                              <input
                                type="text"
                                value={rec.productName}
                                onChange={(e) => {
                                  const updated = [...previewData.recipes];
                                  updated[i].productName = e.target.value;
                                  setPreviewData({ ...previewData, recipes: updated });
                                }}
                                className="bg-black border border-white/20 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:outline-none focus:border-primary"
                              />
                            </div>
                            <span className="text-xs font-mono text-primary">
                              Nominal Yield: {rec.nominalBatchYieldPouches} pouches | {rec.ingredientCount} ingredients
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Ingredients:{' '}
                            {rec.ingredients
                              .map((ing) => `${ing.materialName} (${ing.edibleQuantity}${ing.unit})`)
                              .join(', ')}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Product Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajma Masala 300g"
                      value={newRecipe.productName}
                      onChange={(e) => setNewRecipe({ ...newRecipe, productName: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Nominal Yield (Pouches) *</label>
                    <input
                      type="number"
                      required
                      placeholder="250"
                      value={newRecipe.nominalBatchYieldPouches}
                      onChange={(e) =>
                        setNewRecipe({ ...newRecipe, nominalBatchYieldPouches: Number(e.target.value) })
                      }
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Cooked Batch Weight (kg)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="75"
                      value={newRecipe.batchCookedWeightKg}
                      onChange={(e) =>
                        setNewRecipe({ ...newRecipe, batchCookedWeightKg: Number(e.target.value) })
                      }
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Ingredients & Prep Loss Factors
                    </label>
                    <button
                      type="button"
                      onClick={addIngredientRow}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Ingredient Row
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {newRecipe.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-black/40 p-2.5 rounded-xl border border-white/10">
                        <input
                          type="text"
                          required
                          placeholder="Ingredient Name"
                          value={ing.materialName}
                          onChange={(e) => updateIngredientRow(idx, 'materialName', e.target.value)}
                          className="flex-1 bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="Edible Qty"
                          value={ing.edibleQuantity}
                          onChange={(e) => updateIngredientRow(idx, 'edibleQuantity', e.target.value)}
                          className="w-20 bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                        <select
                          value={ing.unit}
                          onChange={(e) => updateIngredientRow(idx, 'unit', e.target.value)}
                          className="w-20 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          <option value="kg">kg</option>
                          <option value="L">L</option>
                          <option value="pcs">pcs</option>
                          <option value="tin">tin</option>
                          <option value="can">can</option>
                          <option value="box">box</option>
                          <option value="packet">packet</option>
                          <option value="bottle">bottle</option>
                          <option value="jar">jar</option>
                          <option value="bag">bag</option>
                          <option value="g">g</option>
                          <option value="ml">ml</option>
                        </select>
                        <input
                          type="number"
                          step="any"
                          placeholder="Factor"
                          value={ing.lossFactor}
                          onChange={(e) => updateIngredientRow(idx, 'lossFactor', e.target.value)}
                          className="w-20 bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          title="Prep/Peeling Loss Factor (e.g. 1.176)"
                        />
                        <select
                          value={ing.storageType}
                          onChange={(e) => updateIngredientRow(idx, 'storageType', e.target.value)}
                          className="w-24 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          <option value="Ambient">Ambient</option>
                          <option value="Cold">Cold</option>
                        </select>
                        {newRecipe.ingredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeIngredientRow(idx)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
                    Save Recipe
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
