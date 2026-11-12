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
  Trash2,
  Scale,
  Search,
  X,
  ThermometerSnowflake,
  Package
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
  return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
};

const getRecipeStandardYieldKg = (rec) => {
  if (!rec) return 0;
  if (Number(rec.batchCookedWeightKg) > 0) return Number(rec.batchCookedWeightKg);
  if (Number(rec.cookedBatchWeight) > 0) return Number(rec.cookedBatchWeight);
  if (Array.isArray(rec.ingredients) && rec.ingredients.length > 0) {
    const sumKg = rec.ingredients.reduce((acc, ing) => {
      const u = String(ing.unit || 'kg').trim().toLowerCase();
      const mult = u === 'g' || u === 'gm' || u === 'ml' ? 0.001 : 1;
      return acc + (Number(ing.edibleQuantity) || 0) * mult;
    }, 0);
    if (sumKg > 0) return parseFloat(sumKg.toFixed(4));
  }
  return 100;
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
  const [calcBasis, setCalcBasis] = useState('BATCH'); // 'BATCH' or 'YIELD'
  const [noOfBatches, setNoOfBatches] = useState('1');
  const [recipeYield, setRecipeYield] = useState('');
  const [givenYield, setGivenYield] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [issueItems, setIssueItems] = useState([]);
  const [substitutedRmByRow, setSubstitutedRmByRow] = useState({});
  const [swapModalRowIdx, setSwapModalRowIdx] = useState(null);
  const [swapPopoverPos, setSwapPopoverPos] = useState({ top: 100, left: 100, width: 310 });
  const [swapSearch, setSwapSearch] = useState('');
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
    setSubstitutedRmByRow({});
    setNoOfBatches('1');
    setRecipeYield('');
    setGivenYield('');
  };

  const handleRecipeSelect = (recId) => {
    setSelectedRecipeId(recId);
    setSubstitutedRmByRow({});
    if (!recId) {
      setActiveRecipe(null);
      setIssueItems([]);
      setRecipeYield('');
      setGivenYield('');
      return;
    }
    const rec = recipes.find((r) => r._id === recId);
    setActiveRecipe(rec);
    setActiveOrder(null);
    setSelectedOrderId('');
    const stdYield = getRecipeStandardYieldKg(rec);
    setRecipeYield(String(stdYield));
    setGivenYield(String(stdYield));
    setNoOfBatches('1'); // single batch by default
    recalculateIssueItems(rec, null, 1, rawMaterials, calcBasis, stdYield, stdYield, {});
  };

  const handleOrderSelect = (ordId) => {
    setSelectedOrderId(ordId);
    setSubstitutedRmByRow({});
    if (!ordId) {
      setActiveOrder(null);
      setIssueItems([]);
      setRecipeYield('');
      setGivenYield('');
      return;
    }
    const ord = orders.find((o) => o._id === ordId);
    setActiveRecipe(null);
    setActiveOrder(ord);
    setSelectedRecipeId('');
    const batchCount = ord?.items?.[0]?.batches ? String(ord.items[0].batches) : '1';
    const bNum = parseFloat(batchCount) || 1;
    const ordRec = ord?.items?.[0]?.recipe;
    const stdYield = getRecipeStandardYieldKg(ordRec);
    const targetOrderYield = parseFloat((stdYield * bNum).toFixed(4));
    setRecipeYield(String(stdYield));
    setGivenYield(String(targetOrderYield));
    setNoOfBatches(batchCount);
    recalculateIssueItems(null, ord, bNum, rawMaterials, calcBasis, stdYield, targetOrderYield, {});
  };

  const buildIssueRow = (
    ing,
    rowKey,
    validBatches,
    materials,
    cumulativeIssuedByRm,
    basis = 'BATCH',
    rYieldVal = 0,
    gYieldVal = 0,
    subMap = {}
  ) => {
    let unitMultiplier = 1;
    const ingUnitLower = String(ing.unit || 'kg').trim().toLowerCase();
    if (ingUnitLower === 'g' || ingUnitLower === 'gm') unitMultiplier = 0.001;
    if (ingUnitLower === 'ml') unitMultiplier = 0.001;

    const baseEdibleKg = Number(ing.edibleQuantity || 0) * unitMultiplier;
    const baseGrossKg = baseEdibleKg * (Number(ing.lossFactor) || 1.0);

    let recipeEdibleKg = 0;
    let recipeGrossKg = 0;

    if (basis === 'YIELD') {
      const rY = parseFloat(rYieldVal) || 0;
      const gY = parseFloat(gYieldVal) || 0;
      // First divide by yield in recipe, then multiply by given yield:
      // Ingredient A = Qty of A * (Given Yield / Recipe Yield)
      if (rY > 0 && gY >= 0) {
        recipeEdibleKg = parseFloat(((baseEdibleKg / rY) * gY).toFixed(4));
        recipeGrossKg = parseFloat(((baseGrossKg / rY) * gY).toFixed(4));
      }
    } else {
      // By Batch: simply multiply by number of batches
      recipeEdibleKg = parseFloat((baseEdibleKg * validBatches).toFixed(4));
      recipeGrossKg = parseFloat((baseGrossKg * validBatches).toFixed(4));
    }

    const targetUnit =
      ingUnitLower === 'g' || ingUnitLower === 'gm'
        ? 'kg'
        : ingUnitLower === 'ml'
        ? 'L'
        : ing.unit || 'kg';

    const defaultMatchedRm = materials.find(
      (rm) =>
        (ing.rawMaterial && String(rm._id) === String(ing.rawMaterial)) ||
        rm.name.trim().toLowerCase() === ing.materialName.trim().toLowerCase()
    );

    const substitutedRm = subMap && subMap[rowKey] ? subMap[rowKey] : null;
    const matchedRm = substitutedRm || defaultMatchedRm;

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
    const remaining = parseFloat((availStock - previouslyIssued - actualIssuedNum).toFixed(4));
    cumulativeIssuedByRm.set(rmKey, previouslyIssued + actualIssuedNum);

    return {
      rowKey,
      rawMaterialId: matchedRm ? matchedRm._id : ing.rawMaterial,
      materialName: matchedRm ? matchedRm.name : ing.materialName,
      originalMaterialName: defaultMatchedRm ? defaultMatchedRm.name : ing.materialName,
      isSubstituted: Boolean(
        substitutedRm &&
          String(substitutedRm._id) !== String(defaultMatchedRm?._id || ing.rawMaterial || '')
      ),
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

  const recalculateIssueItems = (
    rec,
    ord,
    batchesVal,
    currentMaterials,
    basisOverride,
    recipeYieldOverride,
    givenYieldOverride,
    subMapOverride
  ) => {
    const materials = currentMaterials || rawMaterials;
    const basis = basisOverride || calcBasis;
    const bNum = parseFloat(batchesVal);
    const validBatches = isNaN(bNum) || bNum < 0 ? 0 : bNum;
    const rYieldVal = recipeYieldOverride !== undefined ? recipeYieldOverride : recipeYield;
    const gYieldVal = givenYieldOverride !== undefined ? givenYieldOverride : givenYield;
    const activeSubMap = subMapOverride !== undefined ? subMapOverride : substitutedRmByRow;
    const items = [];
    const cumulativeIssuedByRm = new Map();

    if (rec && rec.ingredients) {
      const effectiveRecipeYield = parseFloat(rYieldVal) || getRecipeStandardYieldKg(rec);
      rec.ingredients.forEach((ing, ingIdx) => {
        const rmKey = ing.rawMaterial || ing.materialName.trim().toLowerCase();
        items.push(
          buildIssueRow(
            ing,
            `${rmKey}_${ingIdx}`,
            validBatches,
            materials,
            cumulativeIssuedByRm,
            basis,
            effectiveRecipeYield,
            gYieldVal,
            activeSubMap
          )
        );
      });
    } else if (ord && ord.items) {
      ord.items.forEach((item, ordItemIdx) => {
        const recipe = item.recipe;
        if (!recipe || !recipe.ingredients) return;
        const effectiveRecipeYield = parseFloat(rYieldVal) || getRecipeStandardYieldKg(recipe);

        recipe.ingredients.forEach((ing, ingIdx) => {
          const rmKey = ing.rawMaterial || ing.materialName.trim().toLowerCase();
          items.push(
            buildIssueRow(
              ing,
              `${rmKey}_${ordItemIdx}_${ingIdx}`,
              validBatches,
              materials,
              cumulativeIssuedByRm,
              basis,
              effectiveRecipeYield,
              gYieldVal,
              activeSubMap
            )
          );
        });
      });
    }

    setIssueItems(items);
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

  const openIngredientSwapModal = (idx, e) => {
    if (e) e.stopPropagation();
    if (swapModalRowIdx === idx) {
      setSwapModalRowIdx(null);
      return;
    }
    if (e?.currentTarget) {
      setSwapPopoverPos(computePopoverPosition(e.currentTarget));
    }
    setSwapModalRowIdx(idx);
    setSwapSearch('');
  };

  const handleSelectSubstituteIngredient = (newRm) => {
    if (swapModalRowIdx === null || !issueItems[swapModalRowIdx] || !newRm) return;
    const targetRow = issueItems[swapModalRowIdx];
    const nextSubMap = {
      ...substitutedRmByRow,
      [targetRow.rowKey]: newRm
    };
    setSubstitutedRmByRow(nextSubMap);

    const stockUnit = newRm.baseUnit || 'kg';
    const variants = getMaterialVariants(newRm);
    const isRmNonStd = isNonStandardUnit(stockUnit);
    const selectedVariantKg =
      isRmNonStd && variants.length > 0
        ? Number(variants[0])
        : isRmNonStd && newRm.unitWeightKg
        ? Number(newRm.unitWeightKg)
        : null;

    const updated = [...issueItems];
    updated[swapModalRowIdx] = {
      ...targetRow,
      rawMaterialId: newRm._id,
      materialName: newRm.name,
      isSubstituted: newRm.name.trim().toLowerCase() !== (targetRow.originalMaterialName || '').trim().toLowerCase(),
      availableStock: newRm.currentStock || 0,
      unit: stockUnit,
      stockUnit,
      variants,
      unitWeightKg: selectedVariantKg,
      actualIssuedQty: isRmNonStd ? '' : targetRow.theoreticalGrossQty
    };

    // Recalculate remainingStock progressively across all rows
    const cumulative = new Map();
    updated.forEach((it) => {
      const rmKey = String(it.rawMaterialId || it.materialName).trim().toLowerCase();
      const usedBefore = cumulative.get(rmKey) || 0;
      const numVal = parseFloat(it.actualIssuedQty);
      const thisIssued = isNaN(numVal) ? 0 : numVal;
      it.remainingStock = parseFloat(((it.availableStock || 0) - usedBefore - thisIssued).toFixed(4));
      cumulative.set(rmKey, usedBefore + thisIssued);
    });

    setIssueItems(updated);
    setSwapModalRowIdx(null);
    setSwapSearch('');
    toast.success(`Switched issue ingredient to "${newRm.name}" (recipe master unchanged)`);
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

  const handleCalcBasisChange = (newBasis) => {
    setCalcBasis(newBasis);
    const rec = activeRecipe || activeOrder?.items?.[0]?.recipe;
    const stdY = parseFloat(recipeYield) || getRecipeStandardYieldKg(rec);
    const bNum = parseFloat(noOfBatches) || 1;
    const gY = givenYield !== '' ? parseFloat(givenYield) : parseFloat((stdY * bNum).toFixed(4));
    if (!recipeYield && stdY > 0) setRecipeYield(String(stdY));
    if (givenYield === '' && gY > 0) setGivenYield(String(gY));
    if (activeRecipe || activeOrder) {
      recalculateIssueItems(activeRecipe, activeOrder, bNum, rawMaterials, newBasis, stdY, gY);
    }
  };

  const handleBatchesChange = (newVal) => {
    setNoOfBatches(newVal);
    const bNum = parseFloat(newVal);
    if (!isNaN(bNum) && bNum >= 0 && (activeRecipe || activeOrder)) {
      recalculateIssueItems(activeRecipe, activeOrder, bNum, rawMaterials, 'BATCH', recipeYield, givenYield);
    }
  };

  const handleRecipeYieldChange = (newVal) => {
    setRecipeYield(newVal);
    const rNum = parseFloat(newVal);
    const gNum = parseFloat(givenYield);
    if (!isNaN(rNum) && rNum > 0 && !isNaN(gNum) && gNum >= 0 && (activeRecipe || activeOrder)) {
      const eqBatches = parseFloat((gNum / rNum).toFixed(4));
      setNoOfBatches(String(eqBatches));
      recalculateIssueItems(activeRecipe, activeOrder, eqBatches, rawMaterials, 'YIELD', rNum, gNum);
    }
  };

  const handleGivenYieldChange = (newVal) => {
    setGivenYield(newVal);
    const gNum = parseFloat(newVal);
    const rNum = parseFloat(recipeYield) || getRecipeStandardYieldKg(activeRecipe || activeOrder?.items?.[0]?.recipe);
    if (!isNaN(gNum) && gNum >= 0 && rNum > 0 && (activeRecipe || activeOrder)) {
      const eqBatches = parseFloat((gNum / rNum).toFixed(4));
      setNoOfBatches(String(eqBatches));
      recalculateIssueItems(activeRecipe, activeOrder, eqBatches, rawMaterials, 'YIELD', rNum, gNum);
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
      it.remainingStock = parseFloat(((it.availableStock || 0) - usedBefore - thisIssued).toFixed(4));
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

    const rYNum = parseFloat(recipeYield) || getRecipeStandardYieldKg(activeRecipe || activeOrder?.items?.[0]?.recipe) || 1;
    const gYNum = parseFloat(givenYield) || 0;
    const bCount =
      calcBasis === 'YIELD' && rYNum > 0
        ? parseFloat((gYNum / rYNum).toFixed(4))
        : parseFloat((parseFloat(noOfBatches) || 1).toFixed(4));

    if (bCount <= 0) {
      toast.error(calcBasis === 'YIELD' ? 'Given yield must be greater than 0' : 'Number of batches must be greater than 0');
      return;
    }

    try {
      setIssuing(true);
      const supervisorLabel =
        calcBasis === 'YIELD'
          ? `By Yield: ${format3Decimals(gYNum)} kg / ${format3Decimals(rYNum)} kg (${bCount}b)`
          : `Batch: ${bCount}`;

      const payload = {
        productionOrderId: selectedOrderId || null,
        recipeId: activeRecipe ? activeRecipe._id : null,
        batches: bCount,
        issueDate: issueDate || new Date().toISOString().split('T')[0],
        buyerName: activeRecipe?.buyerName || activeOrder?.buyerName || activeOrder?.items?.[0]?.recipe?.buyerName || 'General',
        productName: activeRecipe?.productName || activeOrder?.items?.[0]?.productName || 'Recipe Issue',
        kitchenSupervisor: supervisorLabel,
        items: issueItems.map((it) => ({
          ...it,
          openingStock: it.availableStock !== undefined ? parseFloat(Number(it.availableStock).toFixed(4)) : undefined,
          closingStock: it.remainingStock !== undefined ? parseFloat(Number(it.remainingStock).toFixed(4)) : undefined,
          actualIssuedQty: parseFloat((Number(it.actualIssuedQty) || 0).toFixed(4))
        })),
        notes: calcBasis === 'YIELD' && !notes.includes('Yield:') ? `${notes ? `${notes} | ` : ''}[Issued by Yield: ${format3Decimals(gYNum)}kg of ${format3Decimals(rYNum)}kg recipe yield]` : notes
      };

      const res = await apiConnector(`${INVENTORY_MRP_URL}/material-issues`, 'POST', payload);
      if (res.data?.success) {
        toast.success(
          calcBasis === 'YIELD'
            ? `Materials successfully issued for ${format3Decimals(gYNum)} kg yield (${bCount} batch eq.)!`
            : `Materials successfully issued for ${bCount} batch(es)!`
        );
        setSelectedRecipeId('');
        setSelectedOrderId('');
        setActiveRecipe(null);
        setActiveOrder(null);
        setIssueItems([]);
        setNotes('');
        setNoOfBatches('1');
        setRecipeYield('');
        setGivenYield('');
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

          {/* Calculation Basis Toggle: By Batch vs By Yield */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-black/50 border border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider mr-1">
                Issue Calculation Basis:
              </span>
              <button
                type="button"
                onClick={() => handleCalcBasisChange('BATCH')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  calcBasis === 'BATCH'
                    ? 'bg-primary text-black shadow-md shadow-primary/20'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                By Batch (× No. of Batches)
              </button>
              <button
                type="button"
                onClick={() => handleCalcBasisChange('YIELD')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  calcBasis === 'YIELD'
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                By Yield (Given Yield ÷ Recipe Yield)
              </button>
            </div>

            <div className="text-[11px] font-mono text-gray-400">
              {calcBasis === 'BATCH' ? (
                <span>
                  Formula: <strong className="text-primary">Ingredient A = Qty of A × No. of Batches</strong>
                </span>
              ) : (
                <span>
                  Formula:{' '}
                  <strong className="text-emerald-400">
                    Ingredient A = Qty of A × (Given Yield ÷ Recipe Yield)
                  </strong>
                  {parseFloat(recipeYield) > 0 && parseFloat(givenYield) >= 0 && (
                    <span className="ml-2 text-white">
                      [Multiplier: {format3Decimals(parseFloat(givenYield) / parseFloat(recipeYield))}x]
                    </span>
                  )}
                </span>
              )}
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
                      {r.productName} {r.buyerName ? `(${r.buyerName})` : ''} — {getRecipeStandardYieldKg(r)} kg Yield
                    </option>
                  ))}
                </select>
              </div>

              {calcBasis === 'BATCH' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    No of Batches (up to 4 decimals) *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    placeholder="e.g. 1, 0.5, 1.25, 2.5"
                    value={noOfBatches}
                    onChange={(e) => handleBatchesChange(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-primary"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Recipe Yield (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      required
                      placeholder="Recipe Yield"
                      value={recipeYield}
                      onChange={(e) => handleRecipeYieldChange(e.target.value)}
                      className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-emerald-400 mb-1">
                      Given Yield (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      required
                      placeholder="Target Yield"
                      value={givenYield}
                      onChange={(e) => handleGivenYieldChange(e.target.value)}
                      className="w-full bg-black border border-emerald-500/50 rounded-xl px-3 py-2 text-sm text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}

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

              {calcBasis === 'BATCH' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    No of Batches (up to 4 decimals) *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    placeholder="e.g. 1, 0.5, 1.5, 2.5"
                    value={noOfBatches}
                    onChange={(e) => handleBatchesChange(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-primary"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Recipe Yield (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      required
                      placeholder="Recipe Yield"
                      value={recipeYield}
                      onChange={(e) => handleRecipeYieldChange(e.target.value)}
                      className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-emerald-400 mb-1">
                      Given Yield (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      required
                      placeholder="Target Yield"
                      value={givenYield}
                      onChange={(e) => handleGivenYieldChange(e.target.value)}
                      className="w-full bg-black border border-emerald-500/50 rounded-xl px-3 py-2 text-sm text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}

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
                            <div className="flex items-center gap-1.5">
                              <span>{item.materialName}</span>
                              <button
                                type="button"
                                onClick={(e) => openIngredientSwapModal(idx, e)}
                                title="Change / substitute ingredient from Live Stock Ledger (does not change master recipe)"
                                className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-primary transition-colors"
                              >
                                <Scale className="w-3 h-3" />
                              </button>
                            </div>
                            {item.isSubstituted && item.originalMaterialName && (
                              <div className="text-[10px] text-amber-400/90 font-normal mt-0.5">
                                Substituted for: <span className="font-mono">{item.originalMaterialName}</span>
                              </div>
                            )}
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
                                  step="0.0001"
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

      {/* MINI POPOVER BESIDE INGREDIENT: Substitute / Change Issue Ingredient from Live Stock Ledger */}
      {swapModalRowIdx !== null && issueItems[swapModalRowIdx] && (
        <>
          {/* Transparent click-away layer (no screen blur or dark overlay) */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSwapModalRowIdx(null)}
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
                  <span className="truncate">Swap: {issueItems[swapModalRowIdx].materialName}</span>
                </h3>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                  Recipe unchanged • Deducts selected stock
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSwapModalRowIdx(null)}
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
                    String(rm._id) === String(issueItems[swapModalRowIdx].rawMaterialId) ||
                    rm.name.trim().toLowerCase() === issueItems[swapModalRowIdx].materialName.trim().toLowerCase();
                  const isOriginalRecipe =
                    rm.name.trim().toLowerCase() ===
                    (issueItems[swapModalRowIdx].originalMaterialName || '').trim().toLowerCase();
                  const variants = getMaterialVariants(rm);
                  const isNonStd = isNonStandardUnit(rm.baseUnit) && variants.length > 0;
                  const primaryKg = isNonStd ? variants[0] : 0;

                  return (
                    <button
                      key={rm._id}
                      type="button"
                      onClick={() => handleSelectSubstituteIngredient(rm)}
                      className={`w-full text-left px-2.5 py-2 flex items-center justify-between gap-2 transition-colors ${
                        isCurrent
                          ? 'bg-primary/15 text-primary'
                          : 'hover:bg-white/10 text-gray-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate flex items-center gap-1">
                          <span className="truncate">{rm.name}</span>
                          {isOriginalRecipe && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-mono bg-white/10 text-gray-300 shrink-0">
                              Recipe
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

export default MaterialIssue;
