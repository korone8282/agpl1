import React, { useState, useEffect } from 'react';
import { PRODUCT_URL, CATEGORIES_URL } from '../../redux/Utils/constants';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useForm } from "react-hook-form";
import { toast } from 'react-toastify';
import Loader from '../../components/Loader';
import { useSelector } from 'react-redux';
import { Input } from "../../components/Input";
import { Package, Plus, Edit2, Trash2, X, Check } from "lucide-react";
import PageTransition from '../PageTransition';

const Product = () => {
  const { userinfo } = useSelector((state) => state.auth);
  const [buyer, setBuyer] = useState("");
  const [products, setproducts] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitSuccessful },
  } = useForm();

  const [openBox, setopenBox] = useState(0);
  const [categories, setcategories] = useState([]);
  const [currentProduct, setcurrentProduct] = useState();
  const [loading, setLoading] = useState(1);

  useEffect(() => {
    async function getCategories() {
      try {
        const res = await apiConnector(`${CATEGORIES_URL}/categories`, "GET");
        setcategories(res.data.data);
        setLoading(0);
      } catch (error) {
        console.log(error);
      }
    }

    async function getProducts() {
      try {
        const res = await apiConnector(`${PRODUCT_URL}/products`, "GET");
        setproducts(res.data.data);
        setLoading(0);
      } catch (error) {
        console.log(error);
      }
    }

    getCategories();
    getProducts();

    if (isSubmitSuccessful) {
      reset({
        name: "",
        updatedName: "",
      });
    }
  }, [isSubmitSuccessful, reset]);

  async function handleDelete() {
    try {
      await apiConnector(`${PRODUCT_URL}/${currentProduct._id}`, "DELETE", null, {
        Authorization: `Bearer ${userinfo.token}`,
      });

      toast("deleted successfully");
      setcurrentProduct("");
      setopenBox(0);
    } catch (error) {
      console.log(error);
    }
  }

  async function handleCreate(data) {
    if (!buyer) {
      toast("Please select a buyer first");
      return;
    }
    try {
      await apiConnector(`${PRODUCT_URL}/${buyer}`, "POST", data, {
        Authorization: `Bearer ${userinfo.token}`,
      });

      toast("created successfully");
      setcurrentProduct("");
      setopenBox(0);
    } catch (error) {
      console.log(error);
    }
  }

  const handleUpdate = async (data) => {
    try {
      await apiConnector(`${PRODUCT_URL}/update/${currentProduct._id}`, "POST", data, {
        Authorization: `Bearer ${userinfo.token}`,
      });

      toast("updated successfully");
      setcurrentProduct("");
      setopenBox(0);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full space-y-8 text-start">
          {/* Header Bar */}
          <div className="border-b border-white/10 pb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                Master Configuration
              </span>
              <span className="text-zinc-500 text-xs font-mono">• Product Catalog</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Package className="w-7 h-7 text-primary" />
              Manage Products & SKUs
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Register product items associated with buyer accounts for production sheets and MRP planning.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Create New Product Form */}
            <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 p-6 backdrop-blur-xl shadow-xl h-fit">
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Add New Product
              </h2>
              <p className="text-xs text-zinc-400 mb-5">
                Associate a new finished good item with a specific buyer client.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-zinc-400 block mb-1.5 uppercase">Buyer Account</label>
                  <select
                    name="buyerName"
                    className="w-full px-3.5 py-2.5 bg-black border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-primary cursor-pointer"
                    onChange={(e) => setBuyer(e.target.value)}
                    value={buyer}
                  >
                    <option value="">Select Buyer</option>
                    {categories.map((val, index) => (
                      <option value={val.name} key={index}>
                        {val.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-zinc-400 block mb-1.5 uppercase">Product Name</label>
                  <Input
                    type="text"
                    {...register("name")}
                    placeholder="e.g. Butter Chicken 300g"
                    className="w-full px-3.5 py-2.5 bg-black border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSubmit((data) => handleCreate(data))}
                  className="w-full py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-primary/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Product Item
                </button>
              </div>
            </div>

            {/* Right Column: Products List & Edit Drawer */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 p-6 backdrop-blur-xl shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Products for {buyer ? <span className="text-primary">{buyer}</span> : "Selected Buyer"}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {buyer ? "Click any item to edit name or delete." : "Select a buyer above to view their catalog."}
                    </p>
                  </div>
                  {buyer && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-white/5 border border-white/10 text-zinc-400 w-fit">
                      {products?.filter((item) => item.buyer === buyer)?.length || 0} SKUs
                    </span>
                  )}
                </div>

                {loading ? (
                  <Loader />
                ) : (
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {buyer ? (
                      products
                        ?.filter((item) => item.buyer === buyer)
                        .map((product) => {
                          const isSelected = currentProduct?._id === product._id && openBox;
                          return (
                            <button
                              key={product._id}
                              type="button"
                              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 border ${
                                isSelected
                                  ? "bg-primary text-black border-primary font-bold shadow-lg shadow-primary/20 scale-105"
                                  : "bg-white/5 text-zinc-200 border-white/10 hover:border-primary/50 hover:bg-white/10"
                              }`}
                              onClick={() => {
                                setopenBox(1);
                                setcurrentProduct(product);
                              }}
                            >
                              <Package className="w-3.5 h-3.5 opacity-60" />
                              <span>{product.name}</span>
                              <Edit2 className="w-3 h-3 opacity-40 hover:opacity-100" />
                            </button>
                          );
                        })
                    ) : (
                      <p className="text-xs text-zinc-500 italic py-4">
                        Please choose a buyer from the left panel to inspect and manage items.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Edit / Delete Section */}
              {openBox ? (
                <div className="rounded-2xl border border-primary/30 bg-[#141414] p-6 shadow-2xl backdrop-blur-xl animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-white">
                        Edit SKU: <span className="text-primary">{currentProduct?.name}</span>
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setopenBox(0)}
                      className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-mono text-zinc-400 block mb-1.5 uppercase">Updated Product Name</label>
                      <Input
                        type="text"
                        {...register("updatedName")}
                        className="w-full px-3.5 py-2.5 bg-black border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-primary"
                        placeholder={currentProduct?.name}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setopenBox(0)}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-medium cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete SKU
                        </button>

                        <button
                          type="button"
                          onClick={handleSubmit((data) => handleUpdate(data))}
                          className="px-5 py-2 rounded-xl bg-primary hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-primary/20 cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Product;