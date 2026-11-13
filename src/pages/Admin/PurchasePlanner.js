import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Plus,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowLeft,
  X,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  Truck,
  User,
  Calendar,
  MessageSquare,
  Copy,
  ExternalLink,
  ListOrdered,
  Search,
  Download,
  PackageCheck,
  Save,
  RotateCcw,
  Scale,
  ThermometerSnowflake,
  Package
} from 'lucide-react';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { INVENTORY_MRP_URL, CATEGORIES_URL, PRODUCT_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';

const STANDARD_UNITS = ['kg', 'g', 'gm', 'l', 'ltr', 'ml', 'pcs'];

const isNonStandardUnit = (unit) => {
  if (!unit) return false;
  return !STANDARD_UNITS.includes(String(unit).trim().toLowerCase());
};

const getMaterialVariants = (rm) => {
  if (!rm) return [];
  if (Array.isArray(rm.unitWeightVariants) && rm.unitWeightVariants.length > 0) {
    return rm.unitWeightVariants.map(Number).filter((v) => !isNaN(v) && v > 0);
  }
  if (rm.unitWeightKg && Number(rm.unitWeightKg) > 0) {
    return [Number(rm.unitWeightKg)];
  }
  return [];
};

const format3Decimals = (val) => {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const computeAutoDeleteDateStr = (orderDateVal, leadTimeDaysVal) => {
  if (!orderDateVal) return '—';
  const d = new Date(orderDateVal);
  if (isNaN(d.getTime())) return '—';
  const orderDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const lt =
    leadTimeDaysVal !== null && leadTimeDaysVal !== undefined && !isNaN(Number(leadTimeDaysVal))
      ? Math.max(0, Number(leadTimeDaysVal))
      : 1;
  const deleteDate = new Date(orderDayStart.getTime() + (lt + 1) * 86400000);
  return deleteDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const computeEstArrivalDateStr = (orderDateVal, leadTimeDaysVal) => {
  if (!orderDateVal) return '—';
  const d = new Date(orderDateVal);
  if (isNaN(d.getTime())) return '—';
  const orderDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const lt =
    leadTimeDaysVal !== null && leadTimeDaysVal !== undefined && !isNaN(Number(leadTimeDaysVal))
      ? Math.max(0, Number(leadTimeDaysVal))
      : 1;
  const arrivalDate = new Date(orderDayStart.getTime() + lt * 86400000);
  return arrivalDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const PurchasePlanner = () => {
  const navigate = useNavigate();
  const [buyerOrders, setBuyerOrders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [products, setProducts] = useState([]);
  const [mrpData, setMrpData] = useState([]);
  const [selectedMrpVariants, setSelectedMrpVariants] = useState({});
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // Ingredient Swap Mini Popover (Live Material Requirement & Shortage Matrix)
  const [swapMrpRow, setSwapMrpRow] = useState(null);
  const [swapSearch, setSwapSearch] = useState('');
  const [swapPopoverPos, setSwapPopoverPos] = useState({ top: 120, left: 120, width: 300 });

  // PO Pouch Tracker State (Master Buyer Orders)
  const [trackerRows, setTrackerRows] = useState([]);
  const [trackerSearch, setTrackerSearch] = useState('');
  const [trackerSaving, setTrackerSaving] = useState(false);
  const [trackerExporting, setTrackerExporting] = useState(false);
  const [isTrackerDirty, setIsTrackerDirty] = useState(false);
  const [pouchSummary, setPouchSummary] = useState({ products: [], universalPools: [] });

  const normalizePackSize = (val) => {
    if (!val && val !== 0) return '';
    const s = String(val).trim().toLowerCase();
    const num = parseFloat(s.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return s;
    if (s.includes('kg') || num < 5) {
      const grams = Math.round(num * 1000);
      return `${grams}g`;
    }
    const grams = Math.round(num);
    return `${grams}g`;
  };

  const getPouchPoolKey = (row, productList = products, summary = pouchSummary) => {
    const pName = (row.productName || '').trim().toLowerCase();
    const bName = (row.buyerName || '').trim().toLowerCase();

    const prod = (productList || []).find(
      (p) => p.name?.trim().toLowerCase() === pName && (!bName || p.buyer?.trim().toLowerCase() === bName)
    ) || (productList || []).find((p) => p.name?.trim().toLowerCase() === pName);

    const pouchType = row.pouchType || prod?.pouchType || 'exclusive';
    const rawSize = row.packSize || prod?.packSize || '';
    const normSize = normalizePackSize(rawSize);

    if (pouchType === 'universal' && normSize) {
      return {
        poolKey: `universal_${bName}_${normSize}`,
        pouchType: 'universal',
        packSize: normSize,
        label: `Universal (${normSize})`
      };
    }
    return {
      poolKey: `exclusive_${bName}_${pName}`,
      pouchType: 'exclusive',
      packSize: normSize || '1',
      label: 'Exclusive'
    };
  };

  const buildTrackerRows = (ordersList, productList = [], summary = pouchSummary) => {
    const currentMonthIdx = new Date().getMonth();
    const rows = [];
    (ordersList || []).forEach((bo) => {
      const poNo = bo.orderNumber || '';
      const buyer = bo.buyerName || '';
      const defaultDate = bo.deliveryDate
        ? new Date(bo.deliveryDate).toISOString().split('T')[0]
        : '';

      (bo.items || []).forEach((it, itIdx) => {
        const pName = (it.productName || '').trim().toLowerCase();
        const bName = (buyer || '').trim().toLowerCase();

        const prod = (productList || []).find(
          (p) => p.name?.trim().toLowerCase() === pName && (!bName || p.buyer?.trim().toLowerCase() === bName)
        ) || (productList || []).find((p) => p.name?.trim().toLowerCase() === pName);

        const pouchType = it.pouchType || prod?.pouchType || 'exclusive';
        const rawSize = it.packSize || prod?.packSize || '';
        const normSize = normalizePackSize(rawSize);

        let pStock = it.pouchStock;
        if (pStock === undefined || pStock === null || pStock === '') {
          if (pouchType === 'universal' && normSize) {
            const pool = (summary?.universalPools || []).find(
              (up) => up.packSize === normSize && (!bName || up.buyer?.trim().toLowerCase() === bName)
            );
            pStock = pool?.currentBalance ?? pool?.remain ?? prod?.pouches?.[currentMonthIdx]?.remain ?? prod?.pouches?.[currentMonthIdx]?.stock ?? 0;
          } else {
            pStock = prod?.currentBalance ?? prod?.remain ?? prod?.pouches?.[currentMonthIdx]?.remain ?? prod?.pouches?.[currentMonthIdx]?.stock ?? 0;
          }
        }

        rows.push({
          rowKey: it._id ? String(it._id) : `${bo._id || 'new'}_item_${itIdx}_${Math.random()}`,
          orderId: bo._id,
          itemId: it._id,
          orderNumber: poNo,
          buyerName: buyer,
          productName: it.productName || '',
          pouchType: pouchType,
          packSize: normSize || rawSize || '',
          targetPouches: it.targetPouches !== undefined && it.targetPouches !== null ? it.targetPouches : '',
          pouchStock: pStock !== undefined && pStock !== null ? pStock : 0,
          dueArrivalDate: it.dueArrivalDate || defaultDate || ''
        });
      });
    });
    return rows;
  };

  // Selected Planned Production Batches & Master Buyer Orders to Evaluate in MRP Matrix
  const [selectedBatchIds, setSelectedBatchIds] = useState(new Set());
  const [selectedBuyerOrderIds, setSelectedBuyerOrderIds] = useState(new Set());

  // Section 1: Complete Buyer Order Modal
  const [showBuyerOrderModal, setShowBuyerOrderModal] = useState(false);
  const [isCustomBuyer, setIsCustomBuyer] = useState(false);
  const [newBuyerOrder, setNewBuyerOrder] = useState({
    buyerName: '',
    orderNumber: '',
    deliveryDate: '',
    items: [{ productName: '', packSize: '', targetPouches: '' }],
    notes: ''
  });

  const [showEditBuyerOrderModal, setShowEditBuyerOrderModal] = useState(false);
  const [editingBuyerOrder, setEditingBuyerOrder] = useState(null);
  const [editBuyerOrderData, setEditBuyerOrderData] = useState({
    id: '',
    buyerName: '',
    orderNumber: '',
    deliveryDate: '',
    items: [{ productName: '', packSize: '', targetPouches: '' }],
    notes: ''
  });

  // Section 2: Planned Production Batch Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [newOrder, setNewOrder] = useState({
    buyerName: '',
    buyerOrderId: '',
    productName: '',
    packSize: '',
    targetPouches: '',
    productionDate: new Date().toISOString().split('T')[0],
    priority: 'NORMAL',
    notes: ''
  });

  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editFormData, setEditFormData] = useState({
    id: '',
    buyerName: '',
    productName: '',
    packSize: '',
    targetPouches: '',
    productionDate: '',
    priority: 'NORMAL',
    notes: ''
  });

  // Section 3: Material Matrix Selection & WhatsApp PO Modal
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [whatsAppMessage, setWhatsAppMessage] = useState('');

  // Section 3: Incoming PO Batches History Modal
  const [showIncomingBatchesModal, setShowIncomingBatchesModal] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [newBatchInput, setNewBatchInput] = useState({
    orderQty: '',
    orderDate: new Date().toISOString().split('T')[0],
    vendor: '',
    notes: ''
  });

  // Section 4: KPI Drilldown Modals (Active Pipeline & Deficit / DUE)
  const [showActivePipelineModal, setShowActivePipelineModal] = useState(false);
  const [allPipelineOrders, setAllPipelineOrders] = useState([]);
  const [loadingPipelineOrders, setLoadingPipelineOrders] = useState(false);
  const [pipelineSearch, setPipelineSearch] = useState('');

  const [showDeficitDueModal, setShowDeficitDueModal] = useState(false);
  const [deficitSearch, setDeficitSearch] = useState('');

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [buyerRes, orderRes, recRes, rmRes, catRes, prodRes, pouchSumRes] = await Promise.all([
        apiConnector(`${INVENTORY_MRP_URL}/buyer-orders`, 'GET').catch(() => ({ data: { success: false, data: [] } })),
        apiConnector(`${INVENTORY_MRP_URL}/production-orders`, 'GET'),
        apiConnector(`${INVENTORY_MRP_URL}/recipes`, 'GET'),
        apiConnector(`${INVENTORY_MRP_URL}/raw-materials`, 'GET').catch(() => ({ data: { success: false, data: [] } })),
        apiConnector(`${CATEGORIES_URL}/categories`, 'GET').catch(() => ({ data: { data: [] } })),
        apiConnector(`${PRODUCT_URL}/products`, 'GET').catch(() => ({ data: { data: [] } })),
        apiConnector(`${PRODUCT_URL}/pouch-summary`, 'GET').catch(() => ({ data: { success: false, products: [], universalPools: [] } }))
      ]);

      if (rmRes?.data?.success) setRawMaterials(rmRes.data.data || []);

      const prods = prodRes?.data?.data || [];
      setProducts(prods);

      const summary = pouchSumRes?.data?.success ? pouchSumRes.data : { products: [], universalPools: [] };
      setPouchSummary(summary);

      const bos = buyerRes.data?.success ? buyerRes.data.data : [];
      setBuyerOrders(bos);
      setTrackerRows(buildTrackerRows(bos, prods, summary));
      setIsTrackerDirty(false);

      const ords = orderRes.data?.success ? orderRes.data.data : [];
      setOrders(ords);

      const initialBatches = new Set(ords.map((o) => o._id));
      setSelectedBatchIds(initialBatches);

      // If no batches exist yet, but buyer orders exist, select all buyer orders
      const initialBuyerOrders = (ords.length === 0 && bos.length > 0)
        ? new Set(bos.map((b) => b._id))
        : new Set();
      setSelectedBuyerOrderIds(initialBuyerOrders);

      await runMrpCalculation(initialBatches, initialBuyerOrders);

      if (recRes.data?.success) setRecipes(recRes.data.data);
      if (catRes.data?.data) setBuyers(catRes.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load purchase planner data');
    } finally {
      setLoading(false);
    }
  };

  const runMrpCalculation = async (batchesToEval, buyerOrdersToEval) => {
    try {
      setCalculating(true);
      const batchIds = batchesToEval !== undefined ? batchesToEval : selectedBatchIds;
      const buyerIds = buyerOrdersToEval !== undefined ? buyerOrdersToEval : selectedBuyerOrderIds;

      if (batchIds.size === 0 && buyerIds.size === 0) {
        setMrpData([]);
        return;
      }

      const orderQuery = Array.from(batchIds).join(',');
      const buyerQuery = Array.from(buyerIds).join(',');
      const res = await apiConnector(
        `${INVENTORY_MRP_URL}/mrp/calculate?orderIds=${orderQuery}&buyerOrderIds=${buyerQuery}`,
        'GET'
      );
      if (res.data?.success) {
        setMrpData(res.data.data);
        // Refresh activeMaterial in modal if open
        if (activeMaterial) {
          const updated = res.data.data.find((m) => m.materialName === activeMaterial.materialName);
          if (updated) setActiveMaterial(updated);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to run MRP calculation');
    } finally {
      setCalculating(false);
    }
  };

  const computePopoverPosition = (triggerEl) => {
    if (!triggerEl || typeof window === 'undefined') {
      return { top: 120, left: 120, width: 300 };
    }
    const rect = triggerEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sideMargin = 14;
    const topMargin = 72;
    const bottomMargin = 56;
    const popWidth = Math.min(310, vw - sideMargin * 2);
    const popHeight = 330;

    // Open right beside the icon; if not enough horizontal room, clamp within viewport
    let left = rect.right + 10;
    if (left + popWidth > vw - sideMargin) {
      left = Math.max(sideMargin, Math.min(rect.left, vw - popWidth - sideMargin));
    }

    // Center vertically beside the clicked ingredient row (shifted slightly above),
    // and keep a comfortable gap above the bottom edge of the screen
    const iconCenterY = rect.top + rect.height / 2;
    let top = Math.round(iconCenterY - popHeight * 0.55);
    if (top + popHeight > vh - bottomMargin) {
      top = Math.max(topMargin, vh - popHeight - bottomMargin);
    }
    if (top < topMargin) {
      top = topMargin;
    }

    return { top, left, width: popWidth };
  };

  const openMrpIngredientSwapModal = (row, e) => {
    if (e) e.stopPropagation();
    if (swapMrpRow && swapMrpRow.materialName === row.materialName) {
      setSwapMrpRow(null);
      return;
    }
    if (e?.currentTarget) {
      setSwapPopoverPos(computePopoverPosition(e.currentTarget));
    }
    setSwapMrpRow(row);
    setSwapSearch('');
  };

  const handleSelectMrpSubstituteIngredient = async (newRm) => {
    if (!swapMrpRow || !newRm) return;
    const targetRow = swapMrpRow;
    setSwapMrpRow(null);
    setSwapSearch('');

    const oldNameLower = (targetRow.materialName || '').trim().toLowerCase();
    const oldRmId = targetRow.rawMaterialId ? String(targetRow.rawMaterialId) : null;

    if (
      (oldRmId && String(newRm._id) === oldRmId) ||
      newRm.name.trim().toLowerCase() === oldNameLower
    ) {
      return;
    }

    // Identify recipes involved in this MRP row
    const involvedRecipeIds = new Set(
      (targetRow.recipeIdsInvolved || [])
        .concat((targetRow.ordersInvolved || []).map((o) => o.recipeId))
        .filter(Boolean)
        .map(String)
    );
    const involvedProductNames = new Set(
      (targetRow.ordersInvolved || [])
        .map((o) => (o.productName || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const doesIngMatch = (ing) =>
      (oldRmId && ing.rawMaterial && String(ing.rawMaterial) === oldRmId) ||
      (ing.materialName || '').trim().toLowerCase() === oldNameLower;

    let candidateRecipes = recipes.filter((rec) => {
      if (!Array.isArray(rec.ingredients) || !rec.ingredients.some(doesIngMatch)) return false;
      if (involvedRecipeIds.size > 0 && involvedRecipeIds.has(String(rec._id))) return true;
      if (
        involvedProductNames.size > 0 &&
        involvedProductNames.has((rec.productName || '').trim().toLowerCase())
      ) {
        return true;
      }
      return false;
    });

    // Fallback: if no specific recipe IDs matched, update any recipe containing this ingredient
    if (candidateRecipes.length === 0) {
      candidateRecipes = recipes.filter(
        (rec) => Array.isArray(rec.ingredients) && rec.ingredients.some(doesIngMatch)
      );
    }

    try {
      setCalculating(true);
      if (candidateRecipes.length > 0) {
        const updatedRecipeMap = new Map();
        await Promise.all(
          candidateRecipes.map(async (rec) => {
            const updatedIngredients = rec.ingredients.map((ing) =>
              doesIngMatch(ing)
                ? {
                    ...ing,
                    rawMaterial: newRm._id,
                    materialName: newRm.name,
                    materialCode: newRm.code || '',
                    storageType: newRm.storageType || ing.storageType || 'Ambient'
                  }
                : ing
            );
            const res = await apiConnector(
              `${INVENTORY_MRP_URL}/recipes/${rec._id}`,
              'PUT',
              { ingredients: updatedIngredients }
            );
            updatedRecipeMap.set(
              String(rec._id),
              res?.data?.data || { ...rec, ingredients: updatedIngredients }
            );
          })
        );

        setRecipes((prev) =>
          prev.map((r) => updatedRecipeMap.get(String(r._id)) || r)
        );
      }

      if (selectedItems.has(targetRow.materialName)) {
        const nextSel = new Set(selectedItems);
        nextSel.delete(targetRow.materialName);
        nextSel.add(newRm.name);
        setSelectedItems(nextSel);
      }

      await runMrpCalculation();
    } catch (err) {
      console.error('Failed to swap MRP ingredient:', err);
      toast.error('Failed to update recipe ingredient for MRP matrix');
    } finally {
      setCalculating(false);
    }
  };

  // ========================================================
  // BATCH & BUYER ORDER SELECTION FOR SHORTAGE MATRIX FILTERING
  // ========================================================
  const toggleSelectBatch = (batchId) => {
    const updated = new Set(selectedBatchIds);
    if (updated.has(batchId)) {
      updated.delete(batchId);
    } else {
      updated.add(batchId);
    }
    setSelectedBatchIds(updated);
    runMrpCalculation(updated, selectedBuyerOrderIds);
  };

  const handleSelectAllBatches = () => {
    const all = new Set(orders.map((o) => o._id));
    setSelectedBatchIds(all);
    runMrpCalculation(all, selectedBuyerOrderIds);
  };

  const handleDeselectAllBatches = () => {
    const empty = new Set();
    setSelectedBatchIds(empty);
    runMrpCalculation(empty, selectedBuyerOrderIds);
  };

  const toggleSelectBuyerOrder = (buyerOrderId) => {
    const updated = new Set(selectedBuyerOrderIds);
    if (updated.has(buyerOrderId)) {
      updated.delete(buyerOrderId);
    } else {
      updated.add(buyerOrderId);
    }
    setSelectedBuyerOrderIds(updated);
    runMrpCalculation(selectedBatchIds, updated);
  };

  const handleSelectAllBuyerOrders = () => {
    const all = new Set(buyerOrders.map((bo) => bo._id));
    setSelectedBuyerOrderIds(all);
    runMrpCalculation(selectedBatchIds, all);
  };

  const handleDeselectAllBuyerOrders = () => {
    const empty = new Set();
    setSelectedBuyerOrderIds(empty);
    runMrpCalculation(selectedBatchIds, empty);
  };

  // ========================================================
  // BUYER & RECIPE FILTERING HELPERS
  // ========================================================
  const allKnownBuyers = React.useMemo(() => {
    const map = new Map();
    (buyers || []).forEach((b) => {
      const name = (b?.name || '').trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), { _id: b._id || name, name });
      }
    });
    (recipes || []).forEach((r) => {
      const name = (r?.buyerName || '').trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), { _id: `rec-buyer-${name}`, name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [buyers, recipes]);

  const getRecipesForBuyer = (buyerName) => {
    if (!buyerName || !buyerName.trim()) return [];
    const target = buyerName.trim().toLowerCase();
    return recipes.filter((r) => (r.buyerName || '').trim().toLowerCase() === target);
  };

  const findRecipeForBuyerAndProduct = (buyerName, productName) => {
    if (!productName) return null;
    const pTarget = productName.trim().toLowerCase();
    if (buyerName && buyerName.trim()) {
      const bTarget = buyerName.trim().toLowerCase();
      const exact = recipes.find(
        (r) =>
          (r.buyerName || '').trim().toLowerCase() === bTarget &&
          (r.productName || '').trim().toLowerCase() === pTarget
      );
      if (exact) return exact;
    }
    return recipes.find((r) => (r.productName || '').trim().toLowerCase() === pTarget) || null;
  };

  // ========================================================
  // SECTION 1: MASTER COMPLETE BUYER ORDERS HANDLERS
  // ========================================================
  const handleOpenBuyerOrderModal = async () => {
    setIsCustomBuyer(false);
    setShowBuyerOrderModal(true);
    try {
      const catRes = await apiConnector(`${CATEGORIES_URL}/categories`, 'GET');
      if (catRes.data?.data) {
        setBuyers(catRes.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddBuyerOrderItem = () => {
    setNewBuyerOrder({
      ...newBuyerOrder,
      items: [...newBuyerOrder.items, { productName: '', packSize: '', targetPouches: '' }]
    });
  };

  const handleRemoveBuyerOrderItem = (index) => {
    if (newBuyerOrder.items.length === 1) return;
    const updated = newBuyerOrder.items.filter((_, i) => i !== index);
    setNewBuyerOrder({ ...newBuyerOrder, items: updated });
  };

  const handleBuyerOrderItemChange = (index, field, value) => {
    const updated = [...newBuyerOrder.items];
    updated[index][field] = value;
    if (field === 'productName') {
      const rec = findRecipeForBuyerAndProduct(newBuyerOrder.buyerName, value);
      if (rec && rec.packSizes && rec.packSizes.length > 0) {
        updated[index].packSize = rec.packSizes[0];
      } else {
        updated[index].packSize = '';
      }
    }
    setNewBuyerOrder({ ...newBuyerOrder, items: updated });
  };

  const handleCreateBuyerOrder = async (e) => {
    e.preventDefault();
    if (!newBuyerOrder.buyerName.trim()) {
      toast.error('Buyer Name is required');
      return;
    }
    const validItems = newBuyerOrder.items.filter((it) => it.productName && Number(it.targetPouches) > 0);
    if (validItems.length === 0) {
      toast.error('Please specify at least one product with target pouches');
      return;
    }

    try {
      const payload = {
        buyerName: newBuyerOrder.buyerName.trim(),
        orderNumber: newBuyerOrder.orderNumber.trim() || undefined,
        deliveryDate: newBuyerOrder.deliveryDate || null,
        notes: newBuyerOrder.notes,
        items: validItems.map((it) => ({
          productName: it.productName,
          packSize: it.packSize ? Number(it.packSize) : undefined,
          targetPouches: Number(it.targetPouches)
        }))
      };

      const res = await apiConnector(`${INVENTORY_MRP_URL}/buyer-orders`, 'POST', payload);
      if (res.data?.success) {
        toast.success(`Complete Buyer Order ${res.data.data.orderNumber} created!`);
        setShowBuyerOrderModal(false);
        setNewBuyerOrder({
          buyerName: '',
          orderNumber: '',
          deliveryDate: '',
          items: [{ productName: '', packSize: '', targetPouches: '' }],
          notes: ''
        });
        const refRes = await apiConnector(`${INVENTORY_MRP_URL}/buyer-orders`, 'GET');
        if (refRes.data?.success) {
          setBuyerOrders(refRes.data.data);
          setTrackerRows(buildTrackerRows(refRes.data.data, products));
          setIsTrackerDirty(false);
          const updatedSelection = new Set(selectedBuyerOrderIds);
          if (res.data.data?._id) {
            updatedSelection.add(res.data.data._id);
            setSelectedBuyerOrderIds(updatedSelection);
            runMrpCalculation(selectedBatchIds, updatedSelection);
          }
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create complete buyer order');
    }
  };

  const handleOpenEditBuyerOrder = (bo) => {
    setEditingBuyerOrder(bo);
    setEditBuyerOrderData({
      id: bo._id,
      buyerName: bo.buyerName || '',
      orderNumber: bo.orderNumber || '',
      deliveryDate: bo.deliveryDate ? new Date(bo.deliveryDate).toISOString().split('T')[0] : '',
      items:
        bo.items && bo.items.length > 0
          ? bo.items.map((it) => ({
              productName: it.productName || '',
              packSize: it.packSize || '',
              targetPouches: String(it.targetPouches || '')
            }))
          : [{ productName: '', packSize: '', targetPouches: '' }],
      notes: bo.notes || ''
    });
    setShowEditBuyerOrderModal(true);
  };

  const handleAddEditBuyerOrderItem = () => {
    setEditBuyerOrderData({
      ...editBuyerOrderData,
      items: [...editBuyerOrderData.items, { productName: '', packSize: '', targetPouches: '' }]
    });
  };

  const handleRemoveEditBuyerOrderItem = (index) => {
    if (editBuyerOrderData.items.length === 1) return;
    const updated = editBuyerOrderData.items.filter((_, i) => i !== index);
    setEditBuyerOrderData({ ...editBuyerOrderData, items: updated });
  };

  const handleEditBuyerOrderItemChange = (index, field, value) => {
    const updated = [...editBuyerOrderData.items];
    updated[index][field] = value;
    if (field === 'productName') {
      const rec = findRecipeForBuyerAndProduct(editBuyerOrderData.buyerName, value);
      if (rec && rec.packSizes && rec.packSizes.length > 0) {
        updated[index].packSize = rec.packSizes[0];
      } else {
        updated[index].packSize = '';
      }
    }
    setEditBuyerOrderData({ ...editBuyerOrderData, items: updated });
  };

  const handleUpdateBuyerOrder = async (e) => {
    e.preventDefault();
    if (!editBuyerOrderData.buyerName.trim()) {
      toast.error('Buyer Name is required');
      return;
    }
    const validItems = editBuyerOrderData.items.filter((it) => it.productName && Number(it.targetPouches) > 0);
    if (validItems.length === 0) {
      toast.error('Please specify at least one product with target pouches');
      return;
    }

    try {
      const payload = {
        buyerName: editBuyerOrderData.buyerName.trim(),
        orderNumber: editBuyerOrderData.orderNumber ? editBuyerOrderData.orderNumber.trim() : undefined,
        deliveryDate: editBuyerOrderData.deliveryDate || null,
        notes: editBuyerOrderData.notes,
        items: validItems.map((it) => ({
          productName: it.productName,
          packSize: it.packSize ? Number(it.packSize) : undefined,
          targetPouches: Number(it.targetPouches)
        }))
      };

      const res = await apiConnector(`${INVENTORY_MRP_URL}/buyer-orders/${editBuyerOrderData.id}`, 'PUT', payload);
      if (res.data?.success) {
        toast.success(`Complete Buyer Order ${res.data.data.orderNumber} updated!`);
        setShowEditBuyerOrderModal(false);
        setEditingBuyerOrder(null);
        const refRes = await apiConnector(`${INVENTORY_MRP_URL}/buyer-orders`, 'GET');
        if (refRes.data?.success) {
          setBuyerOrders(refRes.data.data);
          setTrackerRows(buildTrackerRows(refRes.data.data, products));
          setIsTrackerDirty(false);
          runMrpCalculation(selectedBatchIds, selectedBuyerOrderIds);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update complete buyer order');
    }
  };

  const handleDeleteBuyerOrder = async (orderId, orderNumber) => {
    if (!window.confirm(`Are you sure you want to delete complete order ${orderNumber}?`)) return;
    try {
      const res = await apiConnector(`${INVENTORY_MRP_URL}/buyer-orders/${orderId}`, 'DELETE');
      if (res.data?.success) {
        toast.success('Complete Buyer Order deleted!');
        const updatedSelected = new Set(selectedBuyerOrderIds);
        const wasSelected = updatedSelected.has(orderId);
        if (wasSelected) {
          updatedSelected.delete(orderId);
          setSelectedBuyerOrderIds(updatedSelected);
        }
        const refRes = await apiConnector(`${INVENTORY_MRP_URL}/buyer-orders`, 'GET');
        if (refRes.data?.success) {
          setBuyerOrders(refRes.data.data);
          setTrackerRows(buildTrackerRows(refRes.data.data, products));
          setIsTrackerDirty(false);
          if (wasSelected) {
            runMrpCalculation(selectedBatchIds, updatedSelected);
          }
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete buyer order');
    }
  };

  const handleScheduleFromBuyerOrder = (bo, item) => {
    const targetItem = item || bo.items[0] || {};
    const rec = findRecipeForBuyerAndProduct(bo.buyerName, targetItem.productName);
    const pSize = targetItem.packSize || (rec && rec.packSizes && rec.packSizes[0]) || '';
    setNewOrder({
      buyerName: bo.buyerName,
      buyerOrderId: bo._id,
      productName: targetItem.productName || '',
      packSize: pSize,
      targetPouches: targetItem.targetPouches ? String(targetItem.targetPouches) : '',
      productionDate: new Date().toISOString().split('T')[0],
      priority: 'NORMAL',
      notes: `Scheduled from Complete Buyer Order ${bo.orderNumber}`
    });
    setShowOrderModal(true);
  };

  // ========================================================
  // PO POUCH TRACKER (FOR MASTER BUYER ORDERS) HANDLERS
  // ========================================================
  const uniqueProductOptions = React.useMemo(() => {
    const set = new Set();
    (recipes || []).forEach((r) => {
      if (r?.productName?.trim()) set.add(r.productName.trim());
    });
    (products || []).forEach((p) => {
      if (p?.name?.trim()) set.add(p.name.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [recipes, products]);

  const handleTrackerCellChange = (rowKey, field, value) => {
    setTrackerRows((prev) =>
      prev.map((r) => {
        if (r.rowKey !== rowKey) return r;
        const updated = { ...r, [field]: value };
        if (field === 'pouchStock') {
          updated.customStock = Number(value) || 0;
        }
        if (field === 'productName' && (!r.pouchStock || Number(r.pouchStock) === 0)) {
          const currentMonthIdx = new Date().getMonth();
          const prod = (products || []).find(
            (p) => p.name?.trim().toLowerCase() === String(value).trim().toLowerCase()
          );
          if (prod && prod.pouches?.[currentMonthIdx]?.stock !== undefined) {
            updated.pouchStock = prod.pouches[currentMonthIdx].remain ?? prod.pouches[currentMonthIdx].stock;
          }
        }
        return updated;
      })
    );
    setIsTrackerDirty(true);
  };

  const handleSyncPouchStockFromDb = async () => {
    try {
      setLoading(true);
      const res = await apiConnector(`${PRODUCT_URL}/pouch-summary`, 'GET');
      if (res.data?.success) {
        setPouchSummary(res.data);
        // Clear manual customStock overrides to re-align with DB
        setTrackerRows((prev) =>
          prev.map((r) => {
            const { customStock, ...rest } = r;
            return rest;
          })
        );
        toast.success('Pouch stocks successfully synchronized with DB Pouch Reconciliation ledger!');
      } else {
        toast.info('Fetched pouch data from database');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync pouch stock from DB');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrackerRow = () => {
    const newRow = {
      rowKey: `new_${Date.now()}_${Math.random()}`,
      orderId: null,
      itemId: null,
      orderNumber: '',
      buyerName: '',
      productName: '',
      pouchType: 'exclusive',
      packSize: '',
      targetPouches: '',
      pouchStock: 0,
      dueArrivalDate: ''
    };
    setTrackerRows((prev) => [newRow, ...prev]);
    setIsTrackerDirty(true);
  };

  const handleDeleteTrackerRow = (rowKey) => {
    setTrackerRows((prev) => prev.filter((r) => r.rowKey !== rowKey));
    setIsTrackerDirty(true);
  };

  const handleResetTracker = () => {
    setTrackerRows(buildTrackerRows(buyerOrders, products, pouchSummary));
    setIsTrackerDirty(false);
    toast.info('PO Pouch Tracker reset to saved database state');
  };

  const handleSaveTracker = async () => {
    try {
      setTrackerSaving(true);
      const res = await apiConnector(
        `${INVENTORY_MRP_URL}/buyer-orders/sync-pouch-tracker`,
        'PUT',
        { rows: computedTrackerRows }
      );
      if (res.data?.success) {
        toast.success(res.data.message || 'PO Pouch Tracker saved successfully!');
        const updatedOrders = res.data.data || [];
        setBuyerOrders(updatedOrders);
        setTrackerRows(buildTrackerRows(updatedOrders, products, pouchSummary));
        setIsTrackerDirty(false);
        const updatedSelected = new Set(selectedBuyerOrderIds);
        updatedOrders.forEach((bo) => {
          if (!selectedBuyerOrderIds.has(bo._id)) {
            updatedSelected.add(bo._id);
          }
        });
        setSelectedBuyerOrderIds(updatedSelected);
        runMrpCalculation(selectedBatchIds, updatedSelected);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save PO Pouch Tracker');
    } finally {
      setTrackerSaving(false);
    }
  };

  const computedTrackerRows = React.useMemo(() => {
    const poolRunning = {};
    const currentMonthIdx = new Date().getMonth();

    const getBasePoolStock = (info, row) => {
      if (info.pouchType === 'universal') {
        const uPool = (pouchSummary?.universalPools || []).find(
          (up) => up.poolKey === info.poolKey || up.packSize === info.packSize
        );
        if (uPool && uPool.currentBalance !== undefined) return uPool.currentBalance;
        if (uPool && uPool.remain !== undefined) return uPool.remain;
      }
      const pName = (row.productName || '').trim().toLowerCase();
      const bName = (row.buyerName || '').trim().toLowerCase();
      const prod = (pouchSummary?.products || []).find(
        (p) => p.name?.trim().toLowerCase() === pName && (!bName || p.buyer?.trim().toLowerCase() === bName)
      ) || (products || []).find(
        (p) => p.name?.trim().toLowerCase() === pName && (!bName || p.buyer?.trim().toLowerCase() === bName)
      ) || (products || []).find(
        (p) => p.name?.trim().toLowerCase() === pName
      );

      if (prod) {
        if (prod.currentBalance !== undefined) return prod.currentBalance;
        if (prod.remain !== undefined) return prod.remain;
        return prod.pouches?.[currentMonthIdx]?.remain ?? prod.pouches?.[currentMonthIdx]?.stock ?? 0;
      }
      return Number(row.pouchStock) || 0;
    };

    return trackerRows.map((row) => {
      const info = getPouchPoolKey(row);
      const poolKey = info.poolKey;

      if (!(poolKey in poolRunning)) {
        const dbStock = getBasePoolStock(info, row);
        const initial = (row.customStock !== undefined && row.customStock !== null)
          ? Number(row.customStock)
          : dbStock;
        poolRunning[poolKey] = initial;
      }

      const availableStock = poolRunning[poolKey];
      const req = Number(row.targetPouches) || 0;
      const due = availableStock - req;

      // Update pool running balance for subsequent rows with this poolKey
      poolRunning[poolKey] = due;

      return {
        ...row,
        pouchType: info.pouchType,
        packSize: info.packSize,
        pouchLabel: info.label,
        poolKey,
        availablePouchStock: availableStock,
        dueBalance: due,
        isShortfall: due < 0
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackerRows, pouchSummary, products]);

  const filteredTrackerRows = computedTrackerRows.filter((r) => {
    if (!trackerSearch.trim()) return true;
    const q = trackerSearch.toLowerCase();
    return (
      (r.orderNumber && r.orderNumber.toLowerCase().includes(q)) ||
      (r.buyerName && r.buyerName.toLowerCase().includes(q)) ||
      (r.productName && r.productName.toLowerCase().includes(q)) ||
      (r.dueArrivalDate && r.dueArrivalDate.toLowerCase().includes(q)) ||
      (r.pouchLabel && r.pouchLabel.toLowerCase().includes(q))
    );
  });

  const handleExportPouchTrackerExcel = async () => {
    try {
      setTrackerExporting(true);
      const response = await fetch(`${INVENTORY_MRP_URL}/buyer-orders/export-pouch-tracker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: filteredTrackerRows
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PO Pouch Tracker Excel file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateTag = new Date().toISOString().split('T')[0];
      a.download = `PO_Pouch_Tracker_${dateTag}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PO Pouch Tracker exported as Excel successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PO Pouch Tracker to Excel');
    } finally {
      setTrackerExporting(false);
    }
  };

  const totalTrackerPouchesRequired = filteredTrackerRows.reduce(
    (sum, r) => sum + (Number(r.targetPouches) || 0),
    0
  );
  const totalTrackerAvailableStock = filteredTrackerRows.reduce(
    (sum, r) => sum + (Number(r.availablePouchStock) || 0),
    0
  );
  const totalTrackerNetDue = filteredTrackerRows.reduce(
    (sum, r) => sum + (Number(r.dueBalance) || 0),
    0
  );

  // ========================================================
  // SECTION 2: PLANNED PRODUCTION BATCHES HANDLERS
  // ========================================================
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newOrder.productName || !newOrder.targetPouches) {
      toast.error('Product and target pouches are required');
      return;
    }

    try {
      const payload = {
        buyerName: newOrder.buyerName,
        buyerOrderId: newOrder.buyerOrderId || null,
        productionDate: newOrder.productionDate,
        priority: newOrder.priority,
        notes: newOrder.notes,
        items: [
          {
            productName: newOrder.productName,
            packSize: newOrder.packSize ? Number(newOrder.packSize) : undefined,
            targetPouches: Number(newOrder.targetPouches)
          }
        ]
      };

      const res = await apiConnector(`${INVENTORY_MRP_URL}/production-orders`, 'POST', payload);
      if (res.data?.success) {
        toast.success('Production batch scheduled successfully!');
        setShowOrderModal(false);
        setNewOrder({
          buyerName: '',
          buyerOrderId: '',
          productName: '',
          packSize: '',
          targetPouches: '',
          productionDate: new Date().toISOString().split('T')[0],
          priority: 'NORMAL',
          notes: ''
        });
        const ordRes = await apiConnector(`${INVENTORY_MRP_URL}/production-orders`, 'GET');
        if (ordRes.data?.success) {
          const updatedOrders = ordRes.data.data;
          setOrders(updatedOrders);
          const updatedSelection = new Set(selectedBatchIds);
          updatedSelection.add(res.data.data._id);
          setSelectedBatchIds(updatedSelection);
          runMrpCalculation(updatedSelection, selectedBuyerOrderIds);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create production order');
    }
  };

  const handleOpenEditOrder = (ord) => {
    const firstItem = ord.items && ord.items[0] ? ord.items[0] : {};
    const rec = findRecipeForBuyerAndProduct(ord.buyerName, firstItem.productName || '');
    const pSize = firstItem.packSize || (rec && rec.packSizes && rec.packSizes[0]) || '';
    setEditingOrder(ord);
    setEditFormData({
      id: ord._id,
      buyerName: ord.buyerName || '',
      productName: firstItem.productName || '',
      packSize: pSize,
      targetPouches: firstItem.targetPouches ? String(firstItem.targetPouches) : '',
      productionDate: ord.productionDate ? new Date(ord.productionDate).toISOString().split('T')[0] : '',
      priority: ord.priority || 'NORMAL',
      notes: ord.notes || ''
    });
    setShowEditOrderModal(true);
  };

  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    if (!editFormData.productName || !editFormData.targetPouches) {
      toast.error('Product and target pouches are required');
      return;
    }

    try {
      const payload = {
        buyerName: editFormData.buyerName,
        productionDate: editFormData.productionDate,
        priority: editFormData.priority,
        notes: editFormData.notes,
        items: [
          {
            productName: editFormData.productName,
            packSize: editFormData.packSize ? Number(editFormData.packSize) : undefined,
            targetPouches: Number(editFormData.targetPouches)
          }
        ]
      };

      const res = await apiConnector(`${INVENTORY_MRP_URL}/production-orders/${editFormData.id}`, 'PUT', payload);
      if (res.data?.success) {
        toast.success('Production batch updated successfully!');
        setShowEditOrderModal(false);
        setEditingOrder(null);
        const ordRes = await apiConnector(`${INVENTORY_MRP_URL}/production-orders`, 'GET');
        if (ordRes.data?.success) {
          setOrders(ordRes.data.data);
          runMrpCalculation(selectedBatchIds, selectedBuyerOrderIds);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update production order');
    }
  };

  const handleDeleteOrder = async (orderId, orderNumber) => {
    if (!window.confirm(`Are you sure you want to delete planned batch ${orderNumber || ''}?`)) {
      return;
    }

    try {
      const res = await apiConnector(`${INVENTORY_MRP_URL}/production-orders/${orderId}`, 'DELETE');
      if (res.data?.success) {
        toast.success('Planned batch deleted successfully!');
        const updatedSelected = new Set(selectedBatchIds);
        updatedSelected.delete(orderId);
        setSelectedBatchIds(updatedSelected);
        const ordRes = await apiConnector(`${INVENTORY_MRP_URL}/production-orders`, 'GET');
        if (ordRes.data?.success) {
          setOrders(ordRes.data.data);
          runMrpCalculation(updatedSelected, selectedBuyerOrderIds);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete production order');
    }
  };

  // ========================================================
  // SECTION 3: INCOMING PO BATCHES HISTORY & ADDING BATCHES
  // ========================================================
  const handleOpenIncomingBatchesModal = (row) => {
    setActiveMaterial(row);
    setNewBatchInput({
      orderQty: row.shortfallQuantity > 0 ? String(row.shortfallQuantity) : '10',
      orderDate: new Date().toISOString().split('T')[0],
      vendor: row.preferredSupplier || '',
      notes: ''
    });
    setShowIncomingBatchesModal(true);
  };

  const handleAddOrderBatch = async (e) => {
    e.preventDefault();
    if (!newBatchInput.orderQty || Number(newBatchInput.orderQty) <= 0) {
      toast.error('Valid order quantity is required');
      return;
    }

    try {
      const payload = {
        materialName: activeMaterial.materialName,
        rawMaterialId: activeMaterial.rawMaterialId,
        orderQty: Number(newBatchInput.orderQty),
        orderDate: newBatchInput.orderDate,
        unit: activeMaterial.baseUnit,
        vendor: newBatchInput.vendor,
        notes: newBatchInput.notes
      };

      const res = await apiConnector(`${INVENTORY_MRP_URL}/material-orders`, 'POST', payload);
      if (res.data?.success) {
        if (res.data?.deletedExpired) {
          toast.info(res.data.message || 'Order batch exceeded lead time + 1 day and was auto-deleted');
        } else {
          toast.success(`Ordered ${newBatchInput.orderQty} ${activeMaterial.baseUnit} of ${activeMaterial.materialName}!`);
        }
        setNewBatchInput({
          orderQty: '',
          orderDate: new Date().toISOString().split('T')[0],
          vendor: activeMaterial.preferredSupplier || '',
          notes: ''
        });
        await runMrpCalculation();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record order batch');
    }
  };

  const handleUpdateOrderBatchDate = async (batchId, newDate) => {
    if (!batchId || !newDate) return;
    try {
      const res = await apiConnector(`${INVENTORY_MRP_URL}/material-orders/${batchId}`, 'PUT', {
        orderDate: newDate
      });
      if (res.data?.success) {
        if (res.data.deletedExpired) {
          toast.info(res.data.message || 'Incoming PO expired (Order Date + Lead Time + 1 Day) and was auto-deleted');
        } else {
          toast.success('Order date updated!');
        }
        if (showActivePipelineModal) {
          const pipeRes = await apiConnector(`${INVENTORY_MRP_URL}/material-orders`, 'GET');
          if (pipeRes.data?.success) setAllPipelineOrders(pipeRes.data.data);
        }
        await runMrpCalculation();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order date');
    }
  };

  const handleDeleteOrderBatch = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this order batch?')) return;
    try {
      const res = await apiConnector(`${INVENTORY_MRP_URL}/material-orders/${batchId}`, 'DELETE');
      if (res.data?.success) {
        toast.info('Order batch removed');
        runMrpCalculation();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove order batch');
    }
  };

  const handleClearAllMaterialOrders = async () => {
    if (!window.confirm(`Clear all incoming orders for ${activeMaterial.materialName}? This will reset status to DUE.`)) return;
    try {
      const res = await apiConnector(`${INVENTORY_MRP_URL}/material-orders/clear`, 'POST', {
        materialName: activeMaterial.materialName,
        rawMaterialId: activeMaterial.rawMaterialId
      });
      if (res.data?.success) {
        toast.info(`All orders cleared for ${activeMaterial.materialName}`);
        runMrpCalculation();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear orders');
    }
  };

  // ========================================================
  // DYNAMIC HEADING BUILDER FOR SELECTED POs / MASTER BUYER ORDERS / ALL
  // ========================================================
  const buildMatrixOrderHeading = () => {
    const selectedBOs = buyerOrders.filter((bo) => selectedBuyerOrderIds.has(bo._id));
    const selectedPOs = orders.filter((o) => selectedBatchIds.has(o._id));

    const allBOsSelected = buyerOrders.length > 0 && selectedBOs.length === buyerOrders.length;
    const allPOsSelected = orders.length > 0 && selectedPOs.length === orders.length;

    let mainHeading = 'LIVE MATERIAL REQUIREMENT & SHORTAGE MATRIX';
    const subHeadingLines = [];

    if (allBOsSelected && allPOsSelected) {
      mainHeading = `ALL MASTER BUYER ORDERS (${selectedBOs.length}) & ALL PLANNED POs (${selectedPOs.length}) — MATERIAL REQUIREMENT & SHORTAGE MATRIX`;
    } else if (selectedBOs.length > 0 && selectedPOs.length === 0) {
      if (allBOsSelected && selectedBOs.length > 1) {
        mainHeading = `ALL MASTER BUYER ORDERS (${selectedBOs.length}) — MATERIAL REQUIREMENT & SHORTAGE MATRIX`;
      } else if (selectedBOs.length === 1) {
        const bo = selectedBOs[0];
        const delivStr = bo.deliveryDate ? ` | Delivery: ${new Date(bo.deliveryDate).toLocaleDateString('en-IN')}` : '';
        mainHeading = `MASTER BUYER ORDER: ${bo.orderNumber} — Buyer: ${bo.buyerName}${delivStr}`;
      } else {
        mainHeading = `SELECTED MASTER BUYER ORDERS (${selectedBOs.length}): ${selectedBOs
          .map((bo) => `${bo.orderNumber} (${bo.buyerName})`)
          .join(', ')}`;
      }
    } else if (selectedPOs.length > 0 && selectedBOs.length === 0) {
      if (allPOsSelected && selectedPOs.length > 1) {
        mainHeading = `ALL PLANNED PRODUCTION ORDERS / POs (${selectedPOs.length}) — MATERIAL REQUIREMENT & SHORTAGE MATRIX`;
      } else if (selectedPOs.length === 1) {
        const po = selectedPOs[0];
        const dateStr = po.productionDate ? ` | Date: ${new Date(po.productionDate).toLocaleDateString('en-IN')}` : '';
        const buyerStr = po.buyerName ? ` | Buyer: ${po.buyerName}` : '';
        mainHeading = `PRODUCTION ORDER (PO): ${po.orderNumber}${buyerStr}${dateStr}`;
      } else {
        mainHeading = `SELECTED PRODUCTION ORDERS / POs (${selectedPOs.length}): ${selectedPOs
          .map((po) => `${po.orderNumber}${po.buyerName ? ` (${po.buyerName})` : ''}`)
          .join(', ')}`;
      }
    } else if (selectedBOs.length > 0 && selectedPOs.length > 0) {
      mainHeading = `SELECTED ORDERS (${selectedBOs.length} Master Buyer Order(s) & ${selectedPOs.length} PO(s)) — MATERIAL REQUIREMENT & SHORTAGE MATRIX`;
    }

    selectedBOs.forEach((bo) => {
      const itemsDesc = (bo.items || [])
        .map((it) => {
          const pSizeTxt = it.packSize
            ? ` [${Number(it.packSize) >= 1 ? `${it.packSize}kg` : `${Math.round(Number(it.packSize) * 1000)}g`}]`
            : '';
          return `${it.productName}${pSizeTxt}: ${Number(it.targetPouches || 0).toLocaleString('en-IN')} pouches`;
        })
        .join(', ');
      const delivTxt = bo.deliveryDate ? ` | Delivery: ${new Date(bo.deliveryDate).toLocaleDateString('en-IN')}` : '';
      subHeadingLines.push(
        `Master Buyer Order ${bo.orderNumber} (${bo.buyerName}${delivTxt}) -> ${itemsDesc}`
      );
    });

    selectedPOs.forEach((po) => {
      const itemsDesc = (po.items || [])
        .map((it) => {
          const pSizeTxt = it.packSize
            ? ` [${Number(it.packSize) >= 1 ? `${it.packSize}kg` : `${Math.round(Number(it.packSize) * 1000)}g`}]`
            : '';
          return `${it.productName}${pSizeTxt}: ${Number(it.targetPouches || 0).toLocaleString('en-IN')} pouches (${it.batches} batches)`;
        })
        .join(', ');
      const dateTxt = po.productionDate ? ` | Scheduled: ${new Date(po.productionDate).toLocaleDateString('en-IN')}` : '';
      const buyerTxt = po.buyerName ? ` | Buyer: ${po.buyerName}` : '';
      subHeadingLines.push(`PO ${po.orderNumber}${buyerTxt}${dateTxt} -> ${itemsDesc}`);
    });

    return { mainHeading, subHeadingLines };
  };

  // ========================================================
  // EXCEL EXPORT & WHATSAPP SEND FOR MATERIAL SHORTAGE MATRIX
  // ========================================================
  const toggleSelectItem = (matName) => {
    const updated = new Set(selectedItems);
    if (updated.has(matName)) updated.delete(matName);
    else updated.add(matName);
    setSelectedItems(updated);
  };

  const selectAllShortages = () => {
    const shortages = mrpData.filter((r) => r.isShortage && r.status !== 'COMPLETE').map((r) => r.materialName);
    setSelectedItems(new Set(shortages));
  };

  const clearSelectedShortages = () => {
    setSelectedItems(new Set());
  };

  const handleExportMatrixExcel = async () => {
    if (!mrpData || mrpData.length === 0) {
      toast.warning('No material requirement rows available to export');
      return;
    }

    const sourceRows =
      selectedItems.size > 0
        ? mrpData.filter((r) => selectedItems.has(r.materialName))
        : mrpData;

    const rowsToExport = sourceRows.map((r) => {
      const unit = r.baseUnit ? ` ${r.baseUnit}` : '';
      const shortfallVal = Number(r.shortfallQuantity || 0);
      return {
        ...r,
        materialName: r.materialName || '',
        grossRequired: `${format3Decimals(r.totalGrossRequired)}${unit}`,
        currentStock: `${format3Decimals(r.currentStock)}${unit}`,
        netShortfall: shortfallVal > 0 ? `-${format3Decimals(shortfallVal)}${unit}` : `0${unit}`
      };
    });

    const { mainHeading, subHeadingLines } = buildMatrixOrderHeading();

    try {
      const response = await fetch(`${INVENTORY_MRP_URL}/mrp/export-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainHeading,
          subHeadingLines,
          rows: rowsToExport
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate Excel file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateTag = new Date().toISOString().split('T')[0];
      a.download = `Material_Requirement_Shortage_Matrix_${dateTag}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Material Requirement & Shortage Matrix exported to Excel!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Excel sheet');
    }
  };

  const handleOpenWhatsAppModal = () => {
    if (!mrpData || mrpData.length === 0) {
      toast.warning('No material requirement data available to send on WhatsApp');
      return;
    }

    const itemsToInclude =
      selectedItems.size > 0
        ? mrpData.filter((r) => selectedItems.has(r.materialName))
        : mrpData;

    if (itemsToInclude.length === 0) {
      toast.warning('No items available to send on WhatsApp');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const { mainHeading, subHeadingLines } = buildMatrixOrderHeading();

    let msg = `*${mainHeading}*\n`;
    if (subHeadingLines.length > 0) {
      subHeadingLines.forEach((line) => {
        msg += `📋 ${line}\n`;
      });
    }
    msg += `📅 *Date:* ${todayStr}\n\n`;
    msg += `*Material Name | Gross Required | Current Stock | Net Shortfall*\n`;
    msg += `----------------------------------------\n`;

    itemsToInclude.forEach((it, idx) => {
      const unit = it.baseUnit || '';
      const grossStr = `${format3Decimals(it.totalGrossRequired)} ${unit}`.trim();
      const stockStr = `${format3Decimals(it.currentStock)} ${unit}`.trim();
      const shortfallVal = Number(it.shortfallQuantity || 0);
      const shortfallStr =
        shortfallVal > 0
          ? `-${format3Decimals(shortfallVal)} ${unit}`.trim()
          : `0 ${unit}`.trim();

      msg += `*${idx + 1}. ${it.materialName}*\n`;
      msg += `   • Gross Required: *${grossStr}*\n`;
      msg += `   • Current Stock: *${stockStr}*\n`;
      msg += `   • Net Shortfall: *${shortfallStr}*\n`;
    });

    setWhatsAppMessage(msg);
    setShowWhatsAppModal(true);
  };

  // ========================================================
  // ACTIVE PIPELINE ORDERS (ALL INGREDIENTS) HANDLERS
  // ========================================================
  const handleOpenActivePipelineModal = async () => {
    setShowActivePipelineModal(true);
    try {
      setLoadingPipelineOrders(true);
      const res = await apiConnector(`${INVENTORY_MRP_URL}/material-orders`, 'GET');
      if (res.data?.success) {
        setAllPipelineOrders(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load active pipeline orders');
    } finally {
      setLoadingPipelineOrders(false);
    }
  };

  const handleDeletePipelineOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order batch from pipeline?')) return;
    try {
      const res = await apiConnector(`${INVENTORY_MRP_URL}/material-orders/${orderId}`, 'DELETE');
      if (res.data?.success) {
        toast.info('Order batch removed from pipeline');
        setAllPipelineOrders((prev) => prev.filter((o) => o._id !== orderId));
        runMrpCalculation();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove order batch');
    }
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = whatsAppPhone.replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsAppMessage)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsAppMessage)}`;
    window.open(url, '_blank');
  };

  const handleCopyWhatsAppMessage = () => {
    navigator.clipboard.writeText(whatsAppMessage);
    toast.success('WhatsApp message copied to clipboard!');
  };

  // Helper batch calculation previews
  const getNominalYield = (recipe, packSize) => {
    if (!recipe) return 250;
    const pSize = Number(packSize);
    if (recipe.batchCookedWeightKg > 0 && pSize > 0) {
      return recipe.batchCookedWeightKg / pSize;
    }
    return recipe.nominalBatchYieldPouches || 250;
  };

  const activeBuyerOrder = newOrder.buyerOrderId ? buyerOrders.find((bo) => bo._id === newOrder.buyerOrderId) : null;
  const selectedRecipeObj = findRecipeForBuyerAndProduct(newOrder.buyerName, newOrder.productName);
  const selectedNominalYield = getNominalYield(selectedRecipeObj, newOrder.packSize);
  const editRecipeObj = findRecipeForBuyerAndProduct(editFormData.buyerName, editFormData.productName);
  const editNominalYield = getNominalYield(editRecipeObj, editFormData.packSize);

  const totalShortages = mrpData.filter((r) => r.isShortage && r.status === 'DUE').length;
  const totalOrderedItems = mrpData.filter((r) => r.status === 'COMPLETE' || r.status === 'PARTIAL').length;
  const estimatedTotalCost = mrpData
    .filter((r) => r.isShortage && r.status === 'DUE')
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
            Complete customer orders, multi-batch incoming order tracking, lead times & WhatsApp PO messaging
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setNewOrder({
                buyerName: '',
                buyerOrderId: '',
                productName: '',
                packSize: '',
                targetPouches: '',
                productionDate: new Date().toISOString().split('T')[0],
                priority: 'NORMAL',
                notes: ''
              });
              setShowOrderModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 transition-all text-sm shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Schedule Production Batch
          </button>
          <button
            onClick={() => runMrpCalculation()}
            disabled={calculating}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-all text-sm"
          >
            {calculating ? 'Calculating...' : 'Recalculate MRP'}
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-secondary/20 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Evaluating Orders</span>
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold">
            {selectedBatchIds.size + selectedBuyerOrderIds.size}{' '}
            <span className="text-sm font-normal text-gray-400">
              / {orders.length + buyerOrders.length} total
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {selectedBuyerOrderIds.size} buyer order(s) &bull; {selectedBatchIds.size} batch(es)
          </div>
        </div>

        <div
          onClick={() => setShowDeficitDueModal(true)}
          className="bg-rose-950/20 border border-rose-500/20 hover:border-rose-500/50 rounded-2xl p-5 backdrop-blur-sm cursor-pointer transition-all hover:scale-[1.01] group"
          title="Click to view all deficit materials, shortfalls, incoming and due quantities"
        >
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Deficit / DUE</span>
            <AlertTriangle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-rose-300">{totalShortages}</div>
          <div className="text-xs text-gray-400 mt-1 flex items-center justify-between">
            <span>Materials pending purchase order</span>
            <span className="text-rose-400 text-[11px] underline font-medium group-hover:text-rose-300">View Details &rarr;</span>
          </div>
        </div>

        <div
          onClick={handleOpenActivePipelineModal}
          className="bg-cyan-950/20 border border-cyan-500/20 hover:border-cyan-500/50 rounded-2xl p-5 backdrop-blur-sm cursor-pointer transition-all hover:scale-[1.01] group"
          title="Click to view all active pipeline orders across all ingredients"
        >
          <div className="flex items-center justify-between text-cyan-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Pipeline</span>
            <Truck className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-cyan-300">{totalOrderedItems}</div>
          <div className="text-xs text-gray-400 mt-1 flex items-center justify-between">
            <span>Materials with ordered batch history</span>
            <span className="text-cyan-400 text-[11px] underline font-medium group-hover:text-cyan-300">View All Orders &rarr;</span>
          </div>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Est. Procurement Cost</span>
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-emerald-300">₹{format3Decimals(estimatedTotalCost)}</div>
          <div className="text-xs text-gray-400 mt-1">For materials currently due</div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: COMPLETE MASTER BUYER ORDERS (MULTI-PRODUCT) */}
      {/* ======================================================== */}
      <div className="mb-10 bg-secondary/10 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Complete Master Buyer Orders
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Check/uncheck buyer orders below to evaluate material requirements for specific buyer orders in matrix
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {buyerOrders.length > 0 && (
              <>
                <button
                  onClick={handleSelectAllBuyerOrders}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium border border-white/15"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-primary" />
                  Select All ({buyerOrders.length})
                </button>
                <button
                  onClick={handleDeselectAllBuyerOrders}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium border border-white/10"
                >
                  <Square className="w-3.5 h-3.5" />
                  Clear Selection
                </button>
              </>
            )}
            <button
              onClick={handleOpenBuyerOrderModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              Add Buyer Order
            </button>
          </div>
        </div>

        {buyerOrders.length === 0 ? (
          <div className="border border-dashed border-white/15 rounded-xl p-8 text-center text-gray-400 text-sm">
            No complete buyer orders added yet. Click &quot;Add Buyer Order&quot; to log multi-product buyer requirements.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buyerOrders.map((bo) => {
              const isSelected = selectedBuyerOrderIds.has(bo._id);
              const totalPouches = (bo.items || []).reduce((acc, it) => acc + (Number(it.targetPouches) || 0), 0);
              return (
                <div
                  key={bo._id}
                  onClick={() => toggleSelectBuyerOrder(bo._id)}
                  className={`border rounded-2xl p-5 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-primary/10 border-primary/60 shadow-lg shadow-primary/10'
                      : 'bg-secondary/15 border-white/10 hover:border-white/20 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectBuyerOrder(bo._id);
                          }}
                          className="rounded border-white/20 bg-black text-primary focus:ring-0 cursor-pointer w-4 h-4"
                        />
                        <span className="font-bold text-white text-base">{bo.buyerName}</span>
                        <span className="font-mono text-[11px] text-gray-400">({bo.orderNumber})</span>
                      </div>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEditBuyerOrder(bo)}
                          title="Edit Buyer Order"
                          className="p-1 rounded text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-primary" />
                        </button>
                        <button
                          onClick={() => handleDeleteBuyerOrder(bo._id, bo.orderNumber)}
                          title="Delete Buyer Order"
                          className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </div>

                    {bo.deliveryDate && (
                      <div className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        Target Delivery: <span className="text-white font-medium">{new Date(bo.deliveryDate).toLocaleDateString()}</span>
                      </div>
                    )}

                    <div className="space-y-1.5 border-t border-white/10 pt-2.5 mb-3">
                      {(bo.items || []).map((it, idx) => (
                        <div
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScheduleFromBuyerOrder(bo, it);
                          }}
                          className="flex items-center justify-between text-xs bg-white/5 hover:bg-white/10 cursor-pointer px-2.5 py-1.5 rounded-lg transition-colors group"
                          title="Click to schedule this product batch"
                        >
                          <span className="font-medium text-white flex items-center gap-1.5 group-hover:text-primary transition-colors">
                            {it.productName}
                            {it.packSize && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">
                                {it.packSize >= 1 ? `${it.packSize}kg` : `${Math.round(it.packSize * 1000)}g`}
                              </span>
                            )}
                          </span>
                          <span className="font-mono font-bold text-primary">{(Number(it.targetPouches) || 0).toLocaleString()} pouches</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="border-t border-white/10 pt-3 flex items-center justify-between mt-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-gray-400">
                        Total: <span className="font-bold text-white font-mono">{totalPouches.toLocaleString()}</span> pouches
                      </span>
                      <button
                        onClick={() => handleScheduleFromBuyerOrder(bo)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all font-semibold"
                      >
                        Schedule Production &rarr;
                      </button>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/10 text-[11px] flex justify-between items-center text-gray-400">
                      <span>{isSelected ? '✓ Evaluated in matrix' : 'Excluded from matrix'}</span>
                      <span className="text-primary underline">Click card to toggle</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 1B: PO POUCH TRACKER TABLE (FOR MASTER BUYER ORDERS) */}
      {/* ======================================================== */}
      <div className="mb-10 bg-secondary/10 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        {/* Header Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">PO Pouch Tracker</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 font-mono">
                {filteredTrackerRows.length} item{filteredTrackerRows.length !== 1 ? 's' : ''}
              </span>
              {isTrackerDirty && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full animate-pulse">
                  ● Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Live editable tracking for Master Buyer Orders &bull; Edit inline, add or delete rows, and sync with MRP matrix
            </p>
          </div>

          {/* Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter PO, Buyer, Product..."
                value={trackerSearch}
                onChange={(e) => setTrackerSearch(e.target.value)}
                className="bg-black/50 border border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary w-48 sm:w-56"
              />
              {trackerSearch && (
                <button
                  type="button"
                  onClick={() => setTrackerSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSyncPouchStockFromDb}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-all"
              title="Fetch latest pouch closing balances directly from database pouch reconciliation ledger"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Sync DB Stock
            </button>

            <button
              type="button"
              onClick={handleAddTrackerRow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </button>

            {isTrackerDirty && (
              <button
                type="button"
                onClick={handleResetTracker}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/15 text-xs font-medium transition-all"
                title="Discard unsaved edits and reload from database"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveTracker}
              disabled={trackerSaving}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-lg transition-all ${
                isTrackerDirty
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
              } disabled:opacity-50`}
            >
              <Save className="w-3.5 h-3.5" />
              {trackerSaving ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={handleExportPouchTrackerExcel}
              disabled={trackerExporting || trackerRows.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 disabled:opacity-40 text-xs shadow-lg shadow-cyan-500/20 transition-all"
              title="Download PO Pouch Tracker Excel file matching PO_Pouch_Tracker.xlsx"
            >
              <Download className="w-3.5 h-3.5" />
              {trackerExporting ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        </div>

        {/* Datalists for Autocomplete */}
        <datalist id="tracker-buyers-list">
          {allKnownBuyers.map((b) => (
            <option key={b._id || b.name} value={b.name} />
          ))}
        </datalist>
        <datalist id="tracker-products-list">
          {uniqueProductOptions.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>

        {/* Tracker Table */}
        <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center font-mono">S No.</th>
                  <th className="py-3 px-3 w-32">PO No.</th>
                  <th className="py-3 px-3 w-36">Buyer Name</th>
                  <th className="py-3 px-3 min-w-[170px]">Product Name</th>
                  <th className="py-3 px-3 w-36">Packaging</th>
                  <th className="py-3 px-3 w-32 text-right">Pouches Req.</th>
                  <th className="py-3 px-3 w-32 text-right">Pouch Stock</th>
                  <th className="py-3 px-3 w-28 text-center">Due / Balance</th>
                  <th className="py-3 px-3 w-36">Due &amp; Arrival Date</th>
                  <th className="py-3 px-2 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTrackerRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-500">
                      {trackerSearch
                        ? 'No matching rows found. Clear search to view all.'
                        : 'No PO items tracked yet. Click "+ Add Row" or add Master Buyer Orders above.'}
                    </td>
                  </tr>
                ) : (
                  filteredTrackerRows.map((row, idx) => {
                    const req = Number(row.targetPouches) || 0;
                    const available = Number(row.availablePouchStock !== undefined ? row.availablePouchStock : row.pouchStock) || 0;
                    const due = Number(row.dueBalance !== undefined ? row.dueBalance : (available - req));
                    const isDeficit = due < 0;

                    return (
                      <tr key={row.rowKey} className="hover:bg-white/[0.03] transition-colors">
                        {/* S No. */}
                        <td className="py-2.5 px-3 text-center font-mono text-gray-500 font-medium">
                          {idx + 1}
                        </td>

                        {/* PO No. */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="e.g. BO-1001"
                            value={row.orderNumber}
                            onChange={(e) => handleTrackerCellChange(row.rowKey, 'orderNumber', e.target.value)}
                            className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-primary focus:outline-none transition-colors"
                          />
                        </td>

                        {/* Buyer Name */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            list="tracker-buyers-list"
                            placeholder="Buyer Name"
                            value={row.buyerName}
                            onChange={(e) => handleTrackerCellChange(row.rowKey, 'buyerName', e.target.value)}
                            className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none transition-colors"
                          />
                        </td>

                        {/* Product Name */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            list="tracker-products-list"
                            placeholder="Product Name"
                            value={row.productName}
                            onChange={(e) => handleTrackerCellChange(row.rowKey, 'productName', e.target.value)}
                            className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors"
                          />
                        </td>

                        {/* Packaging / Pouch Type */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={row.pouchType || 'exclusive'}
                              onChange={(e) => handleTrackerCellChange(row.rowKey, 'pouchType', e.target.value)}
                              className={`rounded-lg px-2 py-1 text-[11px] font-semibold focus:outline-none border ${
                                row.pouchType === 'universal'
                                  ? 'bg-cyan-950/50 text-cyan-300 border-cyan-500/40'
                                  : 'bg-black/60 text-zinc-300 border-white/10'
                              }`}
                            >
                              <option value="exclusive">Exclusive</option>
                              <option value="universal">Universal</option>
                            </select>
                            {row.pouchType === 'universal' && (
                              <input
                                type="text"
                                placeholder="140g"
                                value={row.packSize || ''}
                                onChange={(e) => handleTrackerCellChange(row.rowKey, 'packSize', e.target.value)}
                                className="w-14 bg-black/80 border border-cyan-500/40 text-cyan-300 rounded-lg px-1.5 py-1 text-[11px] font-mono text-center focus:outline-none focus:border-cyan-400"
                                title="Pack size shared across universal pouch products"
                              />
                            )}
                          </div>
                        </td>

                        {/* Pouches Required */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            placeholder="0"
                            value={row.targetPouches}
                            onChange={(e) => handleTrackerCellChange(row.rowKey, 'targetPouches', e.target.value)}
                            className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white text-right focus:outline-none transition-colors"
                          />
                        </td>

                        {/* Pouch Stock Available */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <input
                              type="number"
                              step="1"
                              placeholder="0"
                              value={available}
                              onChange={(e) => handleTrackerCellChange(row.rowKey, 'pouchStock', e.target.value)}
                              className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-cyan-300 text-right focus:outline-none transition-colors"
                              title="Pouch stock available for this order (progressively tracked down order sequence)"
                            />
                            <span className="text-[10px] font-mono text-zinc-500">
                              {row.pouchType === 'universal' ? 'Universal pool' : 'Product stock'}
                            </span>
                          </div>
                        </td>

                        {/* Due / Balance */}
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-xs shadow-sm ${
                              isDeficit
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {due > 0 ? `+${due.toLocaleString()}` : due.toLocaleString()}
                          </span>
                        </td>

                        {/* Due & Arrival Date */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="YYYY-MM-DD"
                            value={row.dueArrivalDate}
                            onChange={(e) => handleTrackerCellChange(row.rowKey, 'dueArrivalDate', e.target.value)}
                            className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-200 focus:outline-none transition-colors"
                          />
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteTrackerRow(row.rowKey)}
                            title="Delete Row"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredTrackerRows.length > 0 && (
                <tfoot className="bg-white/5 border-t border-white/10 text-xs font-semibold">
                  <tr>
                    <td className="py-3 px-3 text-center text-gray-400 font-mono">Total</td>
                    <td className="py-3 px-3 text-gray-400 font-mono" colSpan={4}>
                      {filteredTrackerRows.length} PO Product Item{filteredTrackerRows.length !== 1 ? 's' : ''}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      {totalTrackerPouchesRequired.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300">
                      {totalTrackerAvailableStock.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-xs ${
                          totalTrackerNetDue < 0
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {totalTrackerNetDue > 0 ? `+${totalTrackerNetDue.toLocaleString()}` : totalTrackerNetDue.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-gray-400" colSpan={2}>
                      Progressive allocation active
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: PLANNED PRODUCTION BATCHES (WITH DATE & MULTI-SELECT) */}
      {/* ======================================================== */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Planned Production Batches (Scheduled with Date)
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Check/uncheck batches below to evaluate material requirements for specific POs only
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleSelectAllBatches}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium border border-white/15"
            >
              <CheckSquare className="w-3.5 h-3.5 text-primary" />
              Select All ({orders.length})
            </button>
            <button
              onClick={handleDeselectAllBatches}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium border border-white/10"
            >
              <Square className="w-3.5 h-3.5" />
              Clear Selection
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-secondary/10 border border-white/10 rounded-2xl p-6 text-center text-gray-400 text-sm">
            No production batches scheduled yet. Click &quot;Schedule Production Batch&quot; above to add scheduled batches with dates.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((ord) => {
              const isSelected = selectedBatchIds.has(ord._id);
              return (
                <div
                  key={ord._id}
                  onClick={() => toggleSelectBatch(ord._id)}
                  className={`border rounded-2xl p-5 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-primary/10 border-primary/60 shadow-lg shadow-primary/10'
                      : 'bg-secondary/15 border-white/10 hover:border-white/20 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectBatch(ord._id);
                          }}
                          className="rounded border-white/20 bg-black text-primary focus:ring-0 cursor-pointer w-4 h-4"
                        />
                        <span className="font-mono text-xs text-gray-300 font-semibold">{ord.orderNumber}</span>
                      </div>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditOrder(ord)}
                          title="Edit Order"
                          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-primary" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(ord._id, ord.orderNumber)}
                          title="Delete Order"
                          className="p-1 rounded-md text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[12px] font-semibold ${
                            ord.priority === 'URGENT'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-primary/20 text-primary border border-primary/30'
                          }`}
                        >
                          {ord.priority}
                        </span>
                      </div>
                    </div>

                    {ord.buyerName && (
                      <div className="text-xs font-semibold text-primary mb-1">
                        Buyer: <span className="text-white">{ord.buyerName}</span>
                      </div>
                    )}

                    <div className="mb-3 text-xs text-gray-300">
                      Scheduled Date: <span className="text-white font-medium">{new Date(ord.productionDate).toLocaleDateString()}</span>
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

                  <div className="mt-3 pt-2 border-t border-white/10 text-[11px] flex justify-between items-center text-gray-400">
                    <span>{isSelected ? '✓ Evaluated in matrix' : 'Excluded from matrix'}</span>
                    <span className="text-primary underline">Click card to toggle</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: LIVE MATERIAL REQUIREMENT & SHORTAGE MATRIX */}
      {/* ======================================================== */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Live Material Requirement & Shortage Matrix
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Evaluating requirements for {selectedBuyerOrderIds.size > 0 ? `${selectedBuyerOrderIds.size} buyer order(s)` : ''}
              {selectedBuyerOrderIds.size > 0 && selectedBatchIds.size > 0 ? ' and ' : ''}
              {selectedBatchIds.size > 0 ? `${selectedBatchIds.size} batch(es)` : ''}
              {selectedBuyerOrderIds.size === 0 && selectedBatchIds.size === 0 ? '0 selected orders' : ''} &bull; Click Incoming PO to view/set dates &bull; Export as Excel or Send on WA
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={selectAllShortages}
              className="text-xs text-gray-400 hover:text-white underline"
            >
              Select All DUE Shortages
            </button>
            {selectedItems.size > 0 && (
              <button
                onClick={clearSelectedShortages}
                className="text-xs text-rose-400 hover:text-rose-300 underline"
              >
                Clear Selection ({selectedItems.size})
              </button>
            )}
            <button
              type="button"
              onClick={handleExportMatrixExcel}
              disabled={mrpData.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 disabled:opacity-40 text-xs shadow-lg shadow-cyan-500/20 transition-all"
              title="Export Material Name, Gross Required, Current Stock, and Net Shortfall to Excel with selected PO / Buyer Order heading"
            >
              <Download className="w-4 h-4" />
              Export as Excel {selectedItems.size > 0 ? `(${selectedItems.size})` : '(All)'}
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsAppModal}
              disabled={mrpData.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 disabled:opacity-40 text-xs shadow-lg shadow-emerald-500/20 transition-all"
              title="Send Material Name, Gross Required, Current Stock, and Net Shortfall on WhatsApp with selected PO / Buyer Order heading"
            >
              <MessageSquare className="w-4 h-4" />
              Send on WA {selectedItems.size > 0 ? `(${selectedItems.size} selected)` : '(All)'}
            </button>
          </div>
        </div>

        {loading || calculating ? (
          <div className="py-20 flex justify-center">
            <Loader />
          </div>
        ) : (selectedBatchIds.size === 0 && selectedBuyerOrderIds.size === 0) ? (
          <div className="bg-secondary/10 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
            <Layers className="w-12 h-12 mx-auto text-primary mb-3 opacity-60" />
            <p className="text-lg font-medium text-gray-300">No Orders or Batches Selected</p>
            <p className="text-sm mt-1 text-gray-500">
              Select at least 1 master buyer order or planned production batch above to calculate and display the material requirement matrix.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              {buyerOrders.length > 0 && (
                <button
                  onClick={handleSelectAllBuyerOrders}
                  className="px-4 py-2 rounded-xl bg-primary text-black font-semibold text-xs"
                >
                  Select All Buyer Orders
                </button>
              )}
              {orders.length > 0 && (
                <button
                  onClick={handleSelectAllBatches}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs"
                >
                  Select All Planned Batches
                </button>
              )}
            </div>
          </div>
        ) : mrpData.length === 0 ? (
          <div className="bg-secondary/10 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
            <p className="text-lg font-medium text-gray-300">All Material Requirements Covered</p>
            <p className="text-sm mt-1 text-gray-500">
              Selected production orders have sufficient stock or no ingredient requirements.
            </p>
          </div>
        ) : (
          <div className="bg-secondary/10 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={mrpData.length > 0 && selectedItems.size === mrpData.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(new Set(mrpData.map((r) => r.materialName)));
                          } else {
                            setSelectedItems(new Set());
                          }
                        }}
                        className="rounded border-white/20 bg-black text-primary focus:ring-0 cursor-pointer"
                        title="Select / Deselect all materials"
                      />
                    </th>
                    <th className="py-4 px-4">Material Name</th>
                    <th className="py-4 px-3 text-right">Gross Required</th>
                    <th className="py-4 px-3 text-right">Current Stock</th>
                    <th className="py-4 px-3 text-right font-bold">Net Shortfall</th>
                    <th className="py-4 px-3 text-right text-cyan-400">Incoming PO</th>
                    <th className="py-4 px-3 text-center">Lead Time</th>
                    <th className="py-4 px-3 text-center text-cyan-400">Est. Arrival Date</th>
                    <th className="py-4 px-3 text-right font-bold text-amber-400">Due Shortfall (After Incoming)</th>
                    <th className="py-4 px-3 text-center">Order-By Deadline</th>
                    <th className="py-4 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mrpData.map((row) => {
                    const isSelected = selectedItems.has(row.materialName);
                    const batchCount = row.orderedBatches?.length || 0;
                    const variants = Array.isArray(row.unitWeightVariants) && row.unitWeightVariants.length > 0
                      ? row.unitWeightVariants
                      : row.unitWeightKg > 0
                      ? [Number(row.unitWeightKg)]
                      : [];
                    const baseVariantKg = Number(row.unitWeightKg) || variants[0] || 0;
                    const activeVariantKg =
                      selectedMrpVariants[row.materialName] !== undefined
                        ? Number(selectedMrpVariants[row.materialName])
                        : baseVariantKg;
                    const variantScale =
                      baseVariantKg > 0 && activeVariantKg > 0 ? baseVariantKg / activeVariantKg : 1;
                    const displayGrossRequired = parseFloat(((row.totalGrossRequired || 0) * variantScale).toFixed(3));
                    const displayShortfall = Math.max(0, parseFloat((displayGrossRequired - (row.currentStock || 0)).toFixed(3)));

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
                            onChange={() => toggleSelectItem(row.materialName)}
                            className="rounded border-white/20 bg-black text-primary focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-4 px-4 font-medium text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{row.materialName}</span>
                            <button
                              type="button"
                              onClick={(e) => openMrpIngredientSwapModal(row, e)}
                              title="Change ingredient from Live Stock Ledger (updates recipe & recalculates matrix)"
                              className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-primary transition-colors"
                            >
                              <Scale className="w-3 h-3" />
                            </button>
                          </div>
                          {variants.length > 1 && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-[10px] text-primary font-semibold">Variant:</span>
                              <select
                                value={activeVariantKg}
                                onChange={(e) =>
                                  setSelectedMrpVariants((prev) => ({
                                    ...prev,
                                    [row.materialName]: Number(e.target.value)
                                  }))
                                }
                                className="bg-black border border-primary/50 rounded px-1.5 py-0.5 text-[10px] text-emerald-300 font-mono focus:outline-none focus:border-primary cursor-pointer"
                              >
                                {variants.map((v, vIdx) => (
                                  <option key={vIdx} value={v}>
                                    1 {row.baseUnit} = {format3Decimals(v)} kg
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {variants.length === 1 && (
                            <div className="text-[10px] font-mono text-emerald-400">
                              1 {row.baseUnit} = {format3Decimals(variants[0])} kg
                            </div>
                          )}
                          {row.preferredSupplier && (
                            <div className="text-[12px] text-gray-500">Vendor: {row.preferredSupplier}</div>
                          )}
                        </td>
                        <td className="py-4 px-3 text-right font-mono font-medium text-white">
                          {format3Decimals(displayGrossRequired)} {row.baseUnit}
                        </td>
                        <td className="py-4 px-3 text-right font-mono text-gray-300">
                          {format3Decimals(row.currentStock)} {row.baseUnit}
                        </td>
                        <td className="py-4 px-3 text-right font-mono">
                          {displayShortfall > 0 ? (
                            <span className="text-rose-400 font-bold">
                              -{format3Decimals(displayShortfall)} {row.baseUnit}
                            </span>
                          ) : (
                            <span className="text-emerald-400">0.000 {row.baseUnit}</span>
                          )}
                        </td>

                        {/* Interactive Incoming PO Cell: Opens Multi-Batch History Modal & Add Order */}
                        <td className="py-4 px-3 text-right font-mono">
                          {row.incomingPipelineQty > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenIncomingBatchesModal(row)}
                              title="Click to view all ordered batches & add more"
                              className="group text-right w-full cursor-pointer"
                            >
                              <span className="text-cyan-400 font-bold group-hover:underline block">
                                +{format3Decimals(row.incomingPipelineQty)} {row.baseUnit}
                              </span>
                              <span className="text-[10px] text-cyan-300/80 group-hover:text-cyan-200 block font-sans">
                                {batchCount} batch{batchCount > 1 ? 'es' : ''} &bull; + Add / View
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenIncomingBatchesModal(row)}
                              title="Click to log an incoming order batch"
                              className="group text-right w-full cursor-pointer text-gray-500 hover:text-cyan-400 transition-colors"
                            >
                              <span className="font-mono block">0.000 {row.baseUnit}</span>
                              <span className="text-[11px] text-cyan-400/90 group-hover:underline block font-sans font-medium">
                                + Add Order
                              </span>
                            </button>
                          )}
                        </td>

                        <td className="py-4 px-3 text-center text-gray-300 font-mono">
                          {row.leadTimeDays !== null && row.leadTimeDays !== undefined ? row.leadTimeDays : 1} days
                        </td>
                        <td className="py-4 px-3 text-center font-mono">
                          {row.estArrivalDate ? (
                            <span className="text-cyan-400 font-medium">
                              {new Date(row.estArrivalDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        {/* Shortfall after deducting incoming PO if applicable */}
                        <td className="py-4 px-3 text-right font-mono">
                          {(() => {
                            const dueShortfall = Math.max(0, displayShortfall - (row.incomingPipelineQty || 0));
                            if (dueShortfall > 0) {
                              return (
                                <span className="text-amber-400 font-bold">
                                  -{format3Decimals(dueShortfall)} {row.baseUnit}
                                </span>
                              );
                            }
                            if (displayShortfall > 0 && (row.incomingPipelineQty || 0) >= displayShortfall) {
                              return (
                                <span className="text-emerald-400 font-medium">
                                  0.000 {row.baseUnit} <span className="text-[10px] opacity-75">(Covered)</span>
                                </span>
                              );
                            }
                            return <span className="text-gray-500">0.000 {row.baseUnit}</span>;
                          })()}
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

                        {/* Status Column: ONLY shows the status badge with matching color */}
                        <td className="py-4 px-4 text-center">
                          {row.status === 'NOT REQUIRED' ? (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              NOT REQUIRED
                            </span>
                          ) : row.status === 'COMPLETE' ? (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
                              COMPLETE
                            </span>
                          ) : row.status === 'PARTIAL' ? (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              PARTIAL
                            </span>
                          ) : (
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                row.isUrgent
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              DUE
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

      {/* ======================================================== */}
      {/* MODAL: INCOMING PO BATCHES HISTORY & MULTI-DATE ORDERING */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showIncomingBatchesModal && activeMaterial && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <ListOrdered className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Incoming PO Batches &bull; {activeMaterial.materialName}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Lead Time: <strong className="text-cyan-300">{activeMaterial.leadTimeDays ?? 1} day(s)</strong> &bull; Incoming POs auto-delete on <strong className="text-amber-300">Order Date + Lead Time + 1 Day</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIncomingBatchesModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Material Metrics Summary */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-gray-400">Gross Required</div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-white">
                    {format3Decimals(activeMaterial.totalGrossRequired)} {activeMaterial.baseUnit}
                  </div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-gray-400">Current Stock</div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-gray-300">
                    {format3Decimals(activeMaterial.currentStock)} {activeMaterial.baseUnit}
                  </div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-gray-400">Net Shortfall</div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-rose-400">
                    {activeMaterial.isShortage ? `-${format3Decimals(activeMaterial.shortfallQuantity)}` : '0.000'} {activeMaterial.baseUnit}
                  </div>
                </div>
                <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-cyan-300 font-semibold">Total Ordered</div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-cyan-400">
                    +{format3Decimals(activeMaterial.incomingPipelineQty)} {activeMaterial.baseUnit}
                  </div>
                </div>
              </div>

              {/* Complete List of Ordered Quantities in Descending Order */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Ordered Batches History (Choose / Change Order Date Anytime)
                  </span>
                  {activeMaterial.orderedBatches?.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllMaterialOrders}
                      className="text-xs text-rose-400 hover:text-rose-300 underline font-medium"
                    >
                      Clear All Batches
                    </button>
                  )}
                </div>

                {(!activeMaterial.orderedBatches || activeMaterial.orderedBatches.length === 0) ? (
                  <div className="border border-dashed border-white/15 rounded-xl p-6 text-center text-gray-400 text-xs">
                    No active incoming POs for this material. Use the form below to log an order batch with quantity and date.
                  </div>
                ) : (
                  <div className="border border-white/10 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 border-b border-white/10 text-gray-400">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Date of Ordering</th>
                          <th className="py-2.5 px-3 text-right">Ordered Qty</th>
                          <th className="py-2.5 px-3 text-center">Est. Arrival</th>
                          <th className="py-2.5 px-3 text-center text-amber-300">Auto-Delete On</th>
                          <th className="py-2.5 px-3">Vendor / Notes</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {activeMaterial.orderedBatches.map((batch, idx) => {
                          const ltDays =
                            batch.leadTimeDays !== null && batch.leadTimeDays !== undefined
                              ? batch.leadTimeDays
                              : activeMaterial.leadTimeDays ?? 1;
                          const estDate = computeEstArrivalDateStr(batch.orderDate, ltDays);
                          const autoDelDate = computeAutoDeleteDateStr(batch.orderDate, ltDays);
                          const dateInputVal = batch.orderDate
                            ? new Date(batch.orderDate).toISOString().split('T')[0]
                            : '';
                          return (
                            <tr key={batch._id || idx} className="hover:bg-white/5">
                              <td className="py-2.5 px-3 text-gray-400 font-mono">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="date"
                                  value={dateInputVal}
                                  onChange={(e) => handleUpdateOrderBatchDate(batch._id, e.target.value)}
                                  className="bg-black border border-white/15 hover:border-cyan-400/60 focus:border-cyan-400 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none"
                                  title="Change Date of Ordering"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-400">
                                {format3Decimals(batch.orderQty)} {batch.unit || activeMaterial.baseUnit}
                              </td>
                              <td className="py-2.5 px-3 text-center text-gray-300 font-mono">
                                {estDate}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-amber-300 font-semibold">
                                {autoDelDate}
                              </td>
                              <td className="py-2.5 px-3 text-gray-400 italic">
                                {batch.vendor || batch.notes || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrderBatch(batch._id)}
                                  title="Delete batch"
                                  className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add Order Batch Form */}
              <form onSubmit={handleAddOrderBatch} className="border border-white/10 rounded-xl p-4 bg-black/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    Add Order Batch (e.g. 20, 30, or 50 {activeMaterial.baseUnit})
                  </div>
                  {newBatchInput.orderDate && (
                    <div className="text-[11px] font-mono text-gray-400">
                      Est. Arrival:{' '}
                      <span className="text-cyan-300 font-semibold">
                        {computeEstArrivalDateStr(newBatchInput.orderDate, activeMaterial.leadTimeDays)}
                      </span>{' '}
                      &bull; Auto-Deletes On:{' '}
                      <span className="text-amber-300 font-semibold">
                        {computeAutoDeleteDateStr(newBatchInput.orderDate, activeMaterial.leadTimeDays)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Order Quantity ({activeMaterial.baseUnit}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder={`e.g. 30`}
                      value={newBatchInput.orderQty}
                      onChange={(e) => setNewBatchInput({ ...newBatchInput, orderQty: e.target.value })}
                      className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Date of Ordering *
                    </label>
                    <input
                      type="date"
                      required
                      value={newBatchInput.orderDate}
                      onChange={(e) => setNewBatchInput({ ...newBatchInput, orderDate: e.target.value })}
                      className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Vendor / Supplier (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Local vendor"
                      value={newBatchInput.vendor}
                      onChange={(e) => setNewBatchInput({ ...newBatchInput, vendor: e.target.value })}
                      className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Remarks / Batch Tag (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Advance shipment 1"
                      value={newBatchInput.notes}
                      onChange={(e) => setNewBatchInput({ ...newBatchInput, notes: e.target.value })}
                      className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 text-xs shadow-lg shadow-cyan-500/20"
                  >
                    + Add Order Batch
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: WHATSAPP PURCHASE ORDER GENERATION */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showWhatsAppModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-xl p-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold">Send Material Requirement & Shortage Matrix on WhatsApp</h3>
                </div>
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300">
                  ℹ️ Includes the selected PO / Master Buyer Order / All heading details along with Material Name, Gross Required, Current Stock, and Net Shortfall.
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Vendor WhatsApp Phone Number (Optional - with country code, e.g. 919876543210)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 919876543210"
                    value={whatsAppPhone}
                    onChange={(e) => setWhatsAppPhone(e.target.value)}
                    className="w-full bg-black border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-300">Generated WhatsApp Message Text</label>
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppMessage}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Text
                    </button>
                  </div>
                  <textarea
                    rows="8"
                    value={whatsAppMessage}
                    onChange={(e) => setWhatsAppMessage(e.target.value)}
                    className="w-full bg-black border border-white/15 rounded-xl p-3 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppModal(false)}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyWhatsAppMessage}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm flex items-center gap-1.5"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-5 py-2 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open WhatsApp
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 1: NEW COMPLETE BUYER ORDER */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showBuyerOrderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">New Complete Master Buyer Order</h3>
                </div>
                <button
                  onClick={() => setShowBuyerOrderModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBuyerOrder} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-300">Buyer Name *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomBuyer(!isCustomBuyer);
                          setNewBuyerOrder({
                            ...newBuyerOrder,
                            buyerName: '',
                            items: [{ productName: '', packSize: '', targetPouches: '' }]
                          });
                        }}
                        className="text-[11px] text-primary hover:underline font-medium"
                      >
                        {isCustomBuyer ? "← Choose from DB Buyers" : "+ Enter Custom Buyer"}
                      </button>
                    </div>

                    {!isCustomBuyer ? (
                      <select
                        required
                        value={newBuyerOrder.buyerName}
                        onChange={(e) => {
                          if (e.target.value === '__NEW__') {
                            setIsCustomBuyer(true);
                            setNewBuyerOrder({
                              ...newBuyerOrder,
                              buyerName: '',
                              items: [{ productName: '', packSize: '', targetPouches: '' }]
                            });
                          } else {
                            setNewBuyerOrder({
                              ...newBuyerOrder,
                              buyerName: e.target.value,
                              items: [{ productName: '', packSize: '', targetPouches: '' }]
                            });
                          }
                        }}
                        className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                      >
                        <option value="">-- Select Buyer ({allKnownBuyers.length} available) --</option>
                        {allKnownBuyers.map((b) => (
                          <option key={b._id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                        <option value="__NEW__">+ Enter New Buyer Name...</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        placeholder="Type buyer name..."
                        value={newBuyerOrder.buyerName}
                        onChange={(e) =>
                          setNewBuyerOrder({
                            ...newBuyerOrder,
                            buyerName: e.target.value,
                            items: [{ productName: '', packSize: '', targetPouches: '' }]
                          })
                        }
                        className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                        autoFocus
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Target Delivery Date</label>
                    <input
                      type="date"
                      value={newBuyerOrder.deliveryDate}
                      onChange={(e) => setNewBuyerOrder({ ...newBuyerOrder, deliveryDate: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Dynamic Product Items */}
                <div className="border border-white/10 rounded-xl p-3 bg-black/40">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                        Ordered Products (Multiple Items under Single Order)
                      </label>
                      <span className="text-[11px] text-gray-400">
                        {newBuyerOrder.buyerName.trim()
                          ? `Showing recipes for buyer: ${newBuyerOrder.buyerName.trim()} (${getRecipesForBuyer(newBuyerOrder.buyerName).length} found)`
                          : 'Select a buyer above to view their recipes'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddBuyerOrderItem}
                      disabled={!newBuyerOrder.buyerName.trim()}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Product
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {newBuyerOrder.items.map((item, idx) => {
                      const buyerRecipes = getRecipesForBuyer(newBuyerOrder.buyerName);
                      const rec = findRecipeForBuyerAndProduct(newBuyerOrder.buyerName, item.productName);
                      const hasPackSizes = rec && rec.packSizes && rec.packSizes.length > 0;
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex-1">
                            <select
                              required
                              disabled={!newBuyerOrder.buyerName.trim()}
                              value={item.productName}
                              onChange={(e) => handleBuyerOrderItemChange(idx, 'productName', e.target.value)}
                              className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary disabled:opacity-50"
                            >
                              <option value="">
                                {!newBuyerOrder.buyerName.trim()
                                  ? '-- Select Buyer First --'
                                  : buyerRecipes.length === 0
                                  ? `-- No Recipes Found for ${newBuyerOrder.buyerName.trim()} --`
                                  : '-- Choose Recipe / Product --'}
                              </option>
                              {buyerRecipes.map((r) => (
                                <option key={r._id} value={r.productName}>
                                  {r.productName}
                                </option>
                              ))}
                            </select>
                          </div>
                          {hasPackSizes ? (
                            <div className="w-28">
                              <select
                                value={item.packSize || ''}
                                onChange={(e) => handleBuyerOrderItemChange(idx, 'packSize', e.target.value)}
                                className="w-full bg-gray-950 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                              >
                                <option value="">Pack Size</option>
                                {rec.packSizes.map((ps, psIdx) => (
                                  <option key={psIdx} value={ps}>
                                    {ps >= 1 ? `${ps}kg` : `${Math.round(ps * 1000)}g`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="w-24">
                              <input
                                type="number"
                                step="0.001"
                                placeholder="Pack Size"
                                value={item.packSize || ''}
                                onChange={(e) => handleBuyerOrderItemChange(idx, 'packSize', e.target.value)}
                                className="w-full bg-gray-950 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                              />
                            </div>
                          )}
                          <div className="w-28">
                            <input
                              type="number"
                              required
                              placeholder="Pouches"
                              value={item.targetPouches}
                              onChange={(e) => handleBuyerOrderItemChange(idx, 'targetPouches', e.target.value)}
                              className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                          {newBuyerOrder.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBuyerOrderItem(idx)}
                              className="p-1.5 rounded text-gray-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4 text-rose-400" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Notes / Instructions</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Export order specifications, special pouch batch requirements"
                    value={newBuyerOrder.notes}
                    onChange={(e) => setNewBuyerOrder({ ...newBuyerOrder, notes: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowBuyerOrderModal(false)}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 text-sm"
                  >
                    Save Buyer Order
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 1B: EDIT COMPLETE BUYER ORDER */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showEditBuyerOrderModal && editingBuyerOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">Edit Complete Master Buyer Order</h3>
                  <span className="text-xs font-mono text-gray-400">({editBuyerOrderData.orderNumber})</span>
                </div>
                <button
                  onClick={() => {
                    setShowEditBuyerOrderModal(false);
                    setEditingBuyerOrder(null);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateBuyerOrder} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Buyer Name *</label>
                    <select
                      required
                      value={editBuyerOrderData.buyerName}
                      onChange={(e) =>
                        setEditBuyerOrderData({
                          ...editBuyerOrderData,
                          buyerName: e.target.value,
                          items: [{ productName: '', packSize: '', targetPouches: '' }]
                        })
                      }
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    >
                      <option value="">-- Select Buyer --</option>
                      {allKnownBuyers.map((b) => (
                        <option key={b._id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                      {editBuyerOrderData.buyerName &&
                        !allKnownBuyers.some(
                          (b) => b.name.toLowerCase() === editBuyerOrderData.buyerName.trim().toLowerCase()
                        ) && (
                          <option value={editBuyerOrderData.buyerName}>{editBuyerOrderData.buyerName}</option>
                        )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Target Delivery Date</label>
                    <input
                      type="date"
                      value={editBuyerOrderData.deliveryDate}
                      onChange={(e) => setEditBuyerOrderData({ ...editBuyerOrderData, deliveryDate: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Dynamic Product Items */}
                <div className="border border-white/10 rounded-xl p-3 bg-black/40">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                        Ordered Products (Multiple Items under Single Order)
                      </label>
                      <span className="text-[11px] text-gray-400">
                        {editBuyerOrderData.buyerName.trim()
                          ? `Showing recipes for buyer: ${editBuyerOrderData.buyerName.trim()} (${getRecipesForBuyer(editBuyerOrderData.buyerName).length} found)`
                          : 'Select a buyer above to view their recipes'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddEditBuyerOrderItem}
                      disabled={!editBuyerOrderData.buyerName.trim()}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Product
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {editBuyerOrderData.items.map((item, idx) => {
                      const buyerRecipes = getRecipesForBuyer(editBuyerOrderData.buyerName);
                      const rec = findRecipeForBuyerAndProduct(editBuyerOrderData.buyerName, item.productName);
                      const hasPackSizes = rec && rec.packSizes && rec.packSizes.length > 0;
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex-1">
                            <select
                              required
                              disabled={!editBuyerOrderData.buyerName.trim()}
                              value={item.productName}
                              onChange={(e) => handleEditBuyerOrderItemChange(idx, 'productName', e.target.value)}
                              className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary disabled:opacity-50"
                            >
                              <option value="">
                                {!editBuyerOrderData.buyerName.trim()
                                  ? '-- Select Buyer First --'
                                  : buyerRecipes.length === 0
                                  ? `-- No Recipes Found for ${editBuyerOrderData.buyerName.trim()} --`
                                  : '-- Choose Recipe / Product --'}
                              </option>
                              {buyerRecipes.map((r) => (
                                <option key={r._id} value={r.productName}>
                                  {r.productName}
                                </option>
                              ))}
                              {item.productName &&
                                !buyerRecipes.some((r) => r.productName === item.productName) && (
                                  <option value={item.productName}>{item.productName}</option>
                                )}
                            </select>
                          </div>
                          {hasPackSizes ? (
                            <div className="w-28">
                              <select
                                value={item.packSize || ''}
                                onChange={(e) => handleEditBuyerOrderItemChange(idx, 'packSize', e.target.value)}
                                className="w-full bg-gray-950 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                              >
                                <option value="">Pack Size</option>
                                {rec.packSizes.map((ps, psIdx) => (
                                  <option key={psIdx} value={ps}>
                                    {ps >= 1 ? `${ps}kg` : `${Math.round(ps * 1000)}g`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="w-24">
                              <input
                                type="number"
                                step="0.001"
                                placeholder="Pack Size"
                                value={item.packSize || ''}
                                onChange={(e) => handleEditBuyerOrderItemChange(idx, 'packSize', e.target.value)}
                                className="w-full bg-gray-950 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                              />
                            </div>
                          )}
                          <div className="w-28">
                            <input
                              type="number"
                              required
                              placeholder="Pouches"
                              value={item.targetPouches}
                              onChange={(e) => handleEditBuyerOrderItemChange(idx, 'targetPouches', e.target.value)}
                              className="w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                          {editBuyerOrderData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEditBuyerOrderItem(idx)}
                              className="p-1.5 rounded text-gray-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4 text-rose-400" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Notes / Instructions</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Export order specifications, special pouch batch requirements"
                    value={editBuyerOrderData.notes}
                    onChange={(e) => setEditBuyerOrderData({ ...editBuyerOrderData, notes: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditBuyerOrderModal(false);
                      setEditingBuyerOrder(null);
                    }}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 text-sm"
                  >
                    Update Buyer Order
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 2: SCHEDULE PRODUCTION BATCH */}
      {/* ======================================================== */}
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
                  <h3 className="text-lg font-bold">Schedule Production Batch</h3>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                {newOrder.buyerName && (
                  <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 text-xs flex justify-between items-center">
                    <span className="text-gray-300">Buyer Reference:</span>
                    <span className="font-bold text-primary">{newOrder.buyerName}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Select Product *</label>
                  {activeBuyerOrder && activeBuyerOrder.items && activeBuyerOrder.items.length > 0 ? (
                    <select
                      required
                      value={newOrder.productName}
                      onChange={(e) => {
                        const selectedItem = activeBuyerOrder.items.find((it) => it.productName === e.target.value);
                        if (selectedItem) {
                          setNewOrder({
                            ...newOrder,
                            productName: selectedItem.productName,
                            packSize: selectedItem.packSize || '',
                            targetPouches: selectedItem.targetPouches ? String(selectedItem.targetPouches) : newOrder.targetPouches
                          });
                        } else {
                          setNewOrder({ ...newOrder, productName: e.target.value, packSize: '' });
                        }
                      }}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    >
                      <option value="">-- Choose Product from Order --</option>
                      {activeBuyerOrder.items.map((it, idx) => (
                        <option key={idx} value={it.productName}>
                          {it.productName} {it.packSize ? `(${it.packSize >= 1 ? `${it.packSize}kg` : `${Math.round(it.packSize * 1000)}g`})` : ''} — {Number(it.targetPouches || 0).toLocaleString()} pouches
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      required
                      value={newOrder.productName}
                      onChange={(e) => {
                        const r = recipes.find((rc) => rc.productName === e.target.value);
                        const defPackSize = r && r.packSizes && r.packSizes.length > 0 ? r.packSizes[0] : '';
                        setNewOrder({ ...newOrder, productName: e.target.value, packSize: defPackSize });
                      }}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    >
                      <option value="">-- Choose Product --</option>
                      {recipes.map((r) => (
                        <option key={r._id} value={r.productName}>
                          {r.productName} {r.batchCookedWeightKg > 0 ? `(Cooked: ${r.batchCookedWeightKg}kg)` : `(Yield: ${r.nominalBatchYieldPouches} pouches/batch)`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {activeBuyerOrder && newOrder.packSize && (
                  <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs flex justify-between items-center">
                    <span className="text-gray-400">Order Pack Size:</span>
                    <span className="font-mono font-semibold text-primary">
                      {Number(newOrder.packSize) >= 1 ? `${newOrder.packSize} kg` : `${Math.round(Number(newOrder.packSize) * 1000)} g`}
                    </span>
                  </div>
                )}

                {!activeBuyerOrder && selectedRecipeObj && selectedRecipeObj.packSizes && selectedRecipeObj.packSizes.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Select Pack Size *</label>
                    <select
                      value={newOrder.packSize}
                      onChange={(e) => setNewOrder({ ...newOrder, packSize: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    >
                      {selectedRecipeObj.packSizes.map((ps, psIdx) => {
                        const pouchesYield =
                          selectedRecipeObj.batchCookedWeightKg > 0
                            ? Math.round(selectedRecipeObj.batchCookedWeightKg / ps)
                            : selectedRecipeObj.nominalBatchYieldPouches;
                        return (
                          <option key={psIdx} value={ps}>
                            {ps >= 1 ? `${ps} kg` : `${Math.round(ps * 1000)} g`} ({ps} kg) &rarr; {pouchesYield} pouches/batch
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Target Pouches *</label>
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
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Batches {selectedNominalYield > 0 && `(1 batch = ${Math.round(selectedNominalYield)}p)`}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      placeholder="e.g. 1 or 2.5"
                      value={newOrder.targetPouches && selectedNominalYield > 0 ? (Number(newOrder.targetPouches) / selectedNominalYield).toFixed(3) : ''}
                      onChange={(e) => {
                        const bVal = parseFloat(e.target.value);
                        if (!isNaN(bVal) && bVal >= 0 && selectedNominalYield > 0) {
                          setNewOrder({ ...newOrder, targetPouches: String(Math.round(bVal * selectedNominalYield)) });
                        } else {
                          setNewOrder({ ...newOrder, targetPouches: '' });
                        }
                      }}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-primary focus:outline-none focus:border-primary"
                    />
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
                  <label className="block text-xs font-medium text-gray-300 mb-1">Notes / Remarks</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Scheduled for morning shift"
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
                    Schedule Batch
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 3: EDIT PRODUCTION BATCH */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showEditOrderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-lg p-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">Edit Production Batch</h3>
                  {editingOrder && (
                    <span className="text-xs font-mono text-gray-400">({editingOrder.orderNumber})</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowEditOrderModal(false);
                    setEditingOrder(null);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateOrder} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Select Product *</label>
                  <select
                    required
                    value={editFormData.productName}
                    onChange={(e) => {
                      const r = recipes.find((rc) => rc.productName === e.target.value);
                      const defPackSize = r && r.packSizes && r.packSizes.length > 0 ? r.packSizes[0] : '';
                      setEditFormData({ ...editFormData, productName: e.target.value, packSize: defPackSize });
                    }}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Choose Product --</option>
                    {recipes.map((r) => (
                      <option key={r._id} value={r.productName}>
                        {r.productName} {r.batchCookedWeightKg > 0 ? `(Cooked: ${r.batchCookedWeightKg}kg)` : `(Yield: ${r.nominalBatchYieldPouches} pouches/batch)`}
                      </option>
                    ))}
                  </select>
                </div>

                {editRecipeObj && editRecipeObj.packSizes && editRecipeObj.packSizes.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Select Pack Size *</label>
                    <select
                      value={editFormData.packSize}
                      onChange={(e) => setEditFormData({ ...editFormData, packSize: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    >
                      {editRecipeObj.packSizes.map((ps, psIdx) => {
                        const pouchesYield =
                          editRecipeObj.batchCookedWeightKg > 0
                            ? Math.round(editRecipeObj.batchCookedWeightKg / ps)
                            : editRecipeObj.nominalBatchYieldPouches;
                        return (
                          <option key={psIdx} value={ps}>
                            {ps >= 1 ? `${ps} kg` : `${Math.round(ps * 1000)} g`} ({ps} kg) &rarr; {pouchesYield} pouches/batch
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Target Pouches *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 600"
                      value={editFormData.targetPouches}
                      onChange={(e) => setEditFormData({ ...editFormData, targetPouches: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Batches {editNominalYield > 0 && `(1 batch = ${Math.round(editNominalYield)}p)`}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      placeholder="e.g. 1 or 2.5"
                      value={editFormData.targetPouches && editNominalYield > 0 ? (Number(editFormData.targetPouches) / editNominalYield).toFixed(3) : ''}
                      onChange={(e) => {
                        const bVal = parseFloat(e.target.value);
                        if (!isNaN(bVal) && bVal >= 0 && editNominalYield > 0) {
                          setEditFormData({ ...editFormData, targetPouches: String(Math.round(bVal * editNominalYield)) });
                        } else {
                          setEditFormData({ ...editFormData, targetPouches: '' });
                        }
                      }}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-primary focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Production Date *</label>
                    <input
                      type="date"
                      required
                      value={editFormData.productionDate}
                      onChange={(e) => setEditFormData({ ...editFormData, productionDate: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Priority</label>
                    <select
                      value={editFormData.priority}
                      onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    >
                      <option value="NORMAL">Normal Schedule</option>
                      <option value="URGENT">Urgent / Rush Order</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Notes / Remarks</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Shift note"
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditOrderModal(false);
                      setEditingOrder(null);
                    }}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 text-sm"
                  >
                    Update Batch
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: ACTIVE PIPELINE ORDERS (ALL INGREDIENTS) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showActivePipelineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-5xl p-6 max-h-[90vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-6 h-6 text-cyan-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Active Pipeline Orders (All Ingredients)</h3>
                    <p className="text-xs text-gray-400">
                      All incoming purchase orders in progress &bull; Auto-deletes automatically on <strong className="text-amber-300">Order Date + Lead Time + 1 Day</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowActivePipelineModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Metrics Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search material or vendor..."
                    value={pipelineSearch}
                    onChange={(e) => setPipelineSearch(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold">
                    {allPipelineOrders.length} Order Batches
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300">
                    Total Pipeline Qty: <strong className="text-white">{format3Decimals(allPipelineOrders.reduce((sum, o) => sum + (Number(o.orderQty) || 0), 0))}</strong>
                  </span>
                </div>
              </div>

              {/* Table of Active Pipeline Orders */}
              <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl">
                {loadingPipelineOrders ? (
                  <div className="py-16 flex justify-center">
                    <Loader />
                  </div>
                ) : allPipelineOrders.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-xs">
                    No active pipeline orders found. Log an incoming order batch from the Incoming PO column.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-gray-400 sticky top-0 backdrop-blur-md">
                      <tr>
                        <th className="py-3 px-3.5">#</th>
                        <th className="py-3 px-3.5">Material Name</th>
                        <th className="py-3 px-3 text-center">Date of Ordering</th>
                        <th className="py-3 px-3 text-right font-bold text-cyan-400">Order Qty</th>
                        <th className="py-3 px-3 text-center text-cyan-300 font-medium">Est. Arrival</th>
                        <th className="py-3 px-3 text-center text-amber-300 font-medium">Auto-Delete On</th>
                        <th className="py-3 px-3.5">Vendor Name</th>
                        <th className="py-3 px-3.5">Notes</th>
                        <th className="py-3 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {allPipelineOrders
                        .filter((ord) => {
                          if (!pipelineSearch.trim()) return true;
                          const q = pipelineSearch.toLowerCase();
                          return (
                            (ord.materialName && ord.materialName.toLowerCase().includes(q)) ||
                            (ord.vendorName && ord.vendorName.toLowerCase().includes(q)) ||
                            (ord.vendor && ord.vendor.toLowerCase().includes(q)) ||
                            (ord.notes && ord.notes.toLowerCase().includes(q))
                          );
                        })
                        .map((ord, idx) => {
                          const ltDays =
                            ord.leadTimeDays !== null && ord.leadTimeDays !== undefined ? ord.leadTimeDays : 1;
                          const estDate = computeEstArrivalDateStr(ord.orderDate, ltDays);
                          const autoDelDate = computeAutoDeleteDateStr(ord.orderDate, ltDays);
                          const vendorDisplay = ord.vendorName || ord.vendor || '—';
                          const dateInputVal = ord.orderDate
                            ? new Date(ord.orderDate).toISOString().split('T')[0]
                            : '';

                          return (
                            <tr key={ord._id || idx} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-3.5 text-gray-500 font-mono">{idx + 1}</td>
                              <td className="py-3 px-3.5 font-medium text-white">{ord.materialName}</td>
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="date"
                                  value={dateInputVal}
                                  onChange={(e) => handleUpdateOrderBatchDate(ord._id, e.target.value)}
                                  className="bg-black border border-white/15 hover:border-cyan-400/60 focus:border-cyan-400 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none"
                                  title="Change Date of Ordering"
                                />
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-cyan-400">
                                +{format3Decimals(ord.orderQty)} {ord.unit || 'kg'}
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-cyan-300">
                                {estDate}
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-amber-300 font-semibold">
                                {autoDelDate}
                              </td>
                              <td className="py-3 px-3.5 text-gray-300">{vendorDisplay}</td>
                              <td className="py-3 px-3.5 text-gray-400 italic text-[11px] max-w-[150px] truncate">
                                {ord.notes || '—'}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePipelineOrder(ord._id)}
                                  title="Delete this order batch"
                                  className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex items-center justify-end pt-4 mt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowActivePipelineModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: DEFICIT / DUE MATERIALS SUMMARY */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showDeficitDueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-gray-900 border border-white/15 rounded-2xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Deficit / DUE Materials (Action Required)</h3>
                    <p className="text-xs text-gray-400">
                      Shortfall, incoming pipeline quantities, and net remaining due quantities for active production batches
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeficitDueModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-gray-400">Total Materials in Deficit</div>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {mrpData.filter((r) => r.isShortage).length}
                  </div>
                </div>
                <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-cyan-300">Total Incoming Pipeline</div>
                  <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">
                    +{format3Decimals(
                      mrpData
                        .filter((r) => r.isShortage)
                        .reduce((sum, r) => sum + (r.incomingPipelineQty || 0), 0)
                    )}
                  </div>
                </div>
                <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-rose-300 font-semibold">Net Remaining Due Shortfall</div>
                  <div className="text-base font-bold font-mono text-rose-400 mt-0.5">
                    -{format3Decimals(
                      mrpData
                        .filter((r) => r.isShortage)
                        .reduce(
                          (sum, r) =>
                            sum + Math.max(0, (r.shortfallQuantity || 0) - (r.incomingPipelineQty || 0)),
                          0
                        )
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search deficit material..."
                    value={deficitSearch}
                    onChange={(e) => setDeficitSearch(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-400"
                  />
                </div>
                <button
                  onClick={() => {
                    setShowDeficitDueModal(false);
                    handleOpenWhatsAppModal();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send WhatsApp PO
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl">
                {mrpData.filter((r) => r.isShortage).length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-xs">
                    🎉 No materials in deficit! All requirements are covered.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-gray-400 sticky top-0 backdrop-blur-md">
                      <tr>
                        <th className="py-3 px-3.5">#</th>
                        <th className="py-3 px-3.5">Material Name</th>
                        <th className="py-3 px-3 text-right">Shortfall Qty</th>
                        <th className="py-3 px-3 text-right text-cyan-400">Incoming Qty</th>
                        <th className="py-3 px-3 text-right font-bold text-amber-400">Due Qty</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {mrpData
                        .filter((r) => r.isShortage)
                        .filter((r) => {
                          if (!deficitSearch.trim()) return true;
                          return r.materialName.toLowerCase().includes(deficitSearch.toLowerCase());
                        })
                        .map((row, idx) => {
                          const dueQty = Math.max(0, (row.shortfallQuantity || 0) - (row.incomingPipelineQty || 0));

                          return (
                            <tr key={row.materialName} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-3.5 text-gray-500 font-mono">{idx + 1}</td>
                              <td className="py-3 px-3.5 font-medium text-white">
                                <div>{row.materialName}</div>
                                {row.preferredSupplier && (
                                  <div className="text-[11px] text-gray-500">Vendor: {row.preferredSupplier}</div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-rose-400 font-medium">
                                -{format3Decimals(row.shortfallQuantity)} {row.baseUnit}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-cyan-400 font-semibold">
                                {row.incomingPipelineQty > 0
                                  ? `+${format3Decimals(row.incomingPipelineQty)} ${row.baseUnit}`
                                  : `0.000 ${row.baseUnit}`}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold">
                                {dueQty > 0 ? (
                                  <span className="text-rose-400">
                                    -{format3Decimals(dueQty)} {row.baseUnit}
                                  </span>
                                ) : (
                                  <span className="text-emerald-400">
                                    0.000 {row.baseUnit} <span className="text-[10px] opacity-75">(Covered)</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    row.status === 'COMPLETE'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : row.status === 'PARTIAL'
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {row.status}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowDeficitDueModal(false);
                                    handleOpenIncomingBatchesModal(row);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors"
                                >
                                  + Add Order
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex items-center justify-end pt-4 mt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowDeficitDueModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MINI POPOVER BESIDE MATERIAL: Change / Substitute Ingredient in Live Requirement & Shortage Matrix */}
      {swapMrpRow && (
        <>
          {/* Transparent click-away layer (no screen blur or dark overlay) */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSwapMrpRow(null)}
          />
          <div
            style={{
              top: `${swapPopoverPos.top}px`,
              left: `${swapPopoverPos.left}px`,
              width: `${swapPopoverPos.width}px`,
              maxHeight: 'calc(100vh - 110px)'
            }}
            className="fixed z-50 bg-[#141418] border border-white/20 rounded-xl p-3 shadow-2xl space-y-2.5 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-white/10 pb-2">
              <div className="min-w-0 pr-2">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">Swap: {swapMrpRow.materialName}</span>
                </h3>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                  Updates recipe &bull; Recalculates shortage matrix
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSwapMrpRow(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search stock ledger..."
                value={swapSearch}
                onChange={(e) => setSwapSearch(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Scrollable Live Stock Ledger Ingredients List */}
            <div className="max-h-52 overflow-y-auto divide-y divide-white/5 border border-white/10 rounded-lg bg-black/60">
              {rawMaterials
                .filter((rm) => {
                  if (!swapSearch.trim()) return true;
                  const q = swapSearch.trim().toLowerCase();
                  return (
                    (rm.name && rm.name.toLowerCase().includes(q)) ||
                    (rm.code && rm.code.toLowerCase().includes(q)) ||
                    (rm.baseUnit && rm.baseUnit.toLowerCase().includes(q)) ||
                    (rm.storageType && rm.storageType.toLowerCase().includes(q))
                  );
                })
                .map((rm) => {
                  const isCurrent =
                    (swapMrpRow.rawMaterialId && String(rm._id) === String(swapMrpRow.rawMaterialId)) ||
                    rm.name.trim().toLowerCase() === (swapMrpRow.materialName || '').trim().toLowerCase();
                  const variants = getMaterialVariants(rm);
                  const isNonStd = isNonStandardUnit(rm.baseUnit) && variants.length > 0;
                  const primaryKg = isNonStd ? variants[0] : 0;

                  return (
                    <button
                      key={rm._id}
                      type="button"
                      onClick={() => handleSelectMrpSubstituteIngredient(rm)}
                      className={`w-full text-left px-2.5 py-2 flex items-center justify-between gap-2 transition-colors ${
                        isCurrent
                          ? 'bg-primary/15 text-primary'
                          : 'hover:bg-white/10 text-gray-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate flex items-center gap-1">
                          <span className="truncate">{rm.name}</span>
                          {isCurrent && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-mono bg-white/10 text-gray-300 shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-gray-400">
                          <span className="inline-flex items-center gap-0.5">
                            {rm.storageType === 'Cold' ? (
                              <ThermometerSnowflake className="w-2.5 h-2.5 text-cyan-400" />
                            ) : (
                              <Package className="w-2.5 h-2.5 text-amber-400" />
                            )}
                            {rm.storageType || 'Ambient'}
                          </span>
                          {isNonStd && (
                            <span className="text-emerald-400 font-mono truncate">
                              ({variants.map((v) => `${format3Decimals(v)}kg`).join('/')})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <div className="text-[11px] font-bold text-cyan-300">
                          {isNonStd
                            ? `${format3Decimals((rm.currentStock || 0) * primaryKg)} kg`
                            : `${format3Decimals(rm.currentStock || 0)} ${rm.baseUnit || 'kg'}`}
                        </div>
                        {isNonStd && (
                          <div className="text-[9px] text-gray-400">
                            {format3Decimals(rm.currentStock || 0)} {rm.baseUnit}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PurchasePlanner;
