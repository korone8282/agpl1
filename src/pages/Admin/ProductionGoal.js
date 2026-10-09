import React from 'react'
import { useState , useEffect} from 'react';
import Loader from '../../components/Loader';
import { apiConnector } from '../../redux/Utils/apiConnector';
import {toast} from 'react-toastify';
import { useSelector ,useDispatch } from 'react-redux';
import { GOAL_URL } from '../../redux/Utils/constants';
import CircularSlider from '@fseehawer/react-circular-slider'; 
import { setGoalDate } from '../../redux/Slices/goalSlice';
import { CATEGORIES_URL  } from '../../redux/Utils/constants';
import { PRODUCT_URL } from '../../redux/Utils/constants';
import styled from 'styled-components';
import PageTransition from '../PageTransition';

const ProductionGoal = () => {

  const {userinfo} = useSelector(state=>state.auth);

  setTimeout(()=>{
    window.location.reload();
  },900000);


  const [openBox, setopenBox] = useState(0);
  const [loading, setLoading] = useState(0);
  const [products, setproducts] = useState([]);
  const [categories, setcategories] = useState([]);
  const [goals, setGoals] = useState();
  const [currentGoal, setcurrentGoal] = useState();
  const [error, setError] = useState(0);

  const date = useSelector(state=>state.goal);

  const dispatch = useDispatch();

const [info, setInfo] = useState({
  buyerName:"",
  fname:"",
  batchNum:"",
  pouchSize:"",
  pouchGoal:"",
  pouchPacked:"",
  day:"",
  date:date.date,
});

const inputHandler = async(e) =>{
  setInfo((prevData) => ({
    ...prevData,
    [e.target.name]: e.target.value
  }));
}
  useEffect(() => {

    async function getGoals(){
      try {
    
    setError(0);
    const res = await apiConnector(`${GOAL_URL}/${info.date}`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});
    setGoals(res.data.data);
    setLoading(0);
    
      } catch (error) {
        setError(1);
        console.log(error);
      }
      }

      async function getCategories(){
        try {
  
      const res = await apiConnector(`${CATEGORIES_URL}/categories`,"GET");
      setcategories(res.data.data);
  
      setLoading(0);
        } catch (e) {
          console.log(e)
        }
        }

        async function getProducts(){
          try {
    
        const res = await apiConnector(`${PRODUCT_URL}/products`,"GET");
        setproducts(res.data.data);
    
        setLoading(0);
          } catch (error) {
            console.log(error);
          }
          }
      
      getProducts();
      getCategories();
      getGoals();

  }, [info.date,userinfo.token]);



  const handleUpdate = async() =>{

    const toastId = toast.loading("Loading...",{
      position: 'top-center',
    });

    try {
  
      await apiConnector(`${GOAL_URL}/${currentGoal._id}`,"POST",info,{Authorization: `Bearer ${userinfo.token}`});

      setInfo({
        buyerName:"",
        fname:"",
        batchNum:"",
        pouchSize:"",
        pouchGoal:"",
        pouchPacked:"",
        day:"",
        date:date.date,
      });
      
      toast.dismiss(toastId);
      toast("updated successfully");
      setcurrentGoal("");
      setopenBox(0);
      window.location.reload();
  
    } catch (error) {
      toast.dismiss(toastId);
      console.log(error);
    }
  }

  async function handleDelete(){
    
    const toastId = toast.loading("Loading...",{
      position: 'top-center',
    });

    try {
      
      await apiConnector(`${GOAL_URL}/${currentGoal._id}`,"DELETE",null,{Authorization: `Bearer ${userinfo.token}`});

      setInfo({
        buyerName:"",
        fname:"",
        batchNum:"",
        pouchSize:"",
        pouchGoal:"",
        pouchPacked:"",
        day:"",
        date:date.date,
      });
      
      toast.dismiss(toastId);
      toast("deleted successfully");
      setcurrentGoal("");
      setopenBox(0);
      window.location.reload();
  
    } catch (error) {
      toast.dismiss(toastId);
      console.log(error);
    }
  }

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  Target Tracking
                </span>
                <span className="text-zinc-500 text-xs font-mono">• Production Metrics</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Daily Production Goals
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Live circular completion gauges and shift completion quotas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl">
                <span className="text-xs text-zinc-400 font-mono uppercase">Plan Date:</span>
                <input
                  type="date"
                  value={info.date}
                  name="date"
                  onChange={(e) => {
                    inputHandler(e);
                    dispatch(setGoalDate(e.target.value));
                    window.location.reload();
                  }}
                  className="bg-transparent border-0 text-white text-xs font-mono focus:outline-none cursor-pointer"
                />
              </div>

              <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400">
                Updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>

          {error ? (
            <div className="w-full p-16 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
              <p className="text-2xl font-bold text-zinc-400">No Target Records Found</p>
              <p className="text-sm text-zinc-500 mt-2">No production targets scheduled for this date.</p>
            </div>
          ) : loading ? (
            <Loader />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
              {goals?.map((val, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 hover:border-primary/40 hover:bg-[#121212] p-6 transition-all duration-300 shadow-xl backdrop-blur-xl flex flex-col justify-between cursor-pointer group"
                  onClick={() => {
                    setopenBox(!openBox);
                    setcurrentGoal(val);
                  }}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-primary font-semibold">
                        {val.buyerName}
                      </span>
                      <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                        {val.fname}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                      {val.day || "Shift"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono py-3 px-4 rounded-xl bg-black/60 border border-white/5 mb-6">
                    <div>
                      <span className="text-zinc-500 block">Batch No:</span>
                      <span className="text-zinc-200 font-semibold">{val.batchNum}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Pack Size:</span>
                      <span className="text-zinc-200 font-semibold">{val.pouchSize} Kg</span>
                    </div>
                  </div>

                  {/* Circular Completion Gauge */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="flex w-[180px] h-[180px] justify-center items-center relative">
                      <CircularSlider
                        label="Completion"
                        labelFontSize="0.85rem"
                        valueFontSize="1.75rem"
                        verticalOffset="0.4rem"
                        width={180}
                        labelColor="#f59e0b"
                        progressColorFrom="#00BCD4"
                        progressColorTo="#9C27B0"
                        hideKnob={true}
                        progressSize={16}
                        value={`${((val.pouchPacked / val.pouchGoal) * 100).toFixed(1)}`}
                        appendToValue="%"
                        trackColor="#222"
                        trackSize={18}
                        initialValue={(val.pouchPacked / val.pouchGoal) * 100}
                        knobDraggable={false}
                        dataIndex={(val.pouchPacked / val.pouchGoal) * 360}
                      />
                    </div>

                    <div className="text-xl font-bold font-mono text-white mt-4 flex items-center gap-2">
                      <span>{val.pouchPacked}</span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-zinc-400">{val.pouchGoal}</span>
                      <span className="text-xs text-zinc-500 font-sans">units</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
                    <span>Click to modify or delete</span>
                    <span className="text-primary group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Update Goal Modal */}
          {openBox && currentGoal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4">
                  <h2 className="text-xl font-bold text-white">Update Production Target</h2>
                  <button
                    onClick={() => setopenBox(0)}
                    className="text-zinc-400 hover:text-white text-sm px-2 py-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Buyer Name
                    </label>
                    <select
                      name="buyerName"
                      className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                      value={info.buyerName}
                      onChange={(e) => inputHandler(e)}
                    >
                      <option value="">{currentGoal.buyerName || "Select"}</option>
                      {categories.map((val, index) => (
                        <option value={val.name} key={index}>
                          {val.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Product Name
                    </label>
                    <select
                      name="fname"
                      className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                      value={info.fname}
                      onChange={(e) => inputHandler(e)}
                    >
                      <option value="">{currentGoal.fname || "Select"}</option>
                      {products
                        ?.filter((product) => product.buyer === info.buyerName)
                        .map((val, index) => (
                          <option value={val.name} key={index}>
                            {val.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Batch Number
                      </label>
                      <input
                        type="text"
                        id="email"
                        value={info.batchNum}
                        placeholder={currentGoal.batchNum}
                        name="batchNum"
                        onChange={(e) => inputHandler(e)}
                        className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white text-sm font-mono focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Pouch Size (Kg)
                      </label>
                      <input
                        type="number"
                        id="pass"
                        value={info.pouchSize}
                        placeholder={currentGoal.pouchSize}
                        name="pouchSize"
                        onChange={(e) => inputHandler(e)}
                        className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white text-sm font-mono focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Pouch Target
                      </label>
                      <input
                        type="number"
                        id="confirmPassword"
                        name="pouchGoal"
                        value={info.pouchGoal}
                        placeholder={currentGoal.pouchGoal}
                        onChange={(e) => inputHandler(e)}
                        className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white text-sm font-mono focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Pouch Packed
                      </label>
                      <input
                        type="number"
                        id="confirmPassword"
                        name="pouchPacked"
                        value={info.pouchPacked}
                        placeholder={currentGoal.pouchPacked}
                        onChange={(e) => inputHandler(e)}
                        className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white text-sm font-mono focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      Shift Timing
                    </label>
                    <div className="flex items-center gap-10 px-4 py-3 bg-black border border-white/10 rounded-xl">
                      <StyledWrapper>
                        <label className="checkbox-btn">
                          Day Shift <label htmlFor="checkbox" />
                          <input
                            id="checkbox"
                            type="checkbox"
                            name="day"
                            value="Day"
                            onClick={(e) => {
                              inputHandler(e);
                              document.getElementById("nightCheckbox").checked = false;
                            }}
                          />
                          <span className="checkmark" />
                        </label>
                      </StyledWrapper>

                      <StyledWrapper>
                        <label className="checkbox-btn">
                          Night Shift <label htmlFor="nightCheckbox" />
                          <input
                            id="nightCheckbox"
                            type="checkbox"
                            name="day"
                            value="Night"
                            onClick={(e) => {
                              inputHandler(e);
                              document.getElementById("checkbox").checked = false;
                            }}
                          />
                          <span className="checkmark" />
                        </label>
                      </StyledWrapper>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all"
                      onClick={() => setopenBox(0)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-semibold transition-all"
                      onClick={handleDelete}
                    >
                      Delete Goal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-primary/20"
                      onClick={handleUpdate}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

export default ProductionGoal

const StyledWrapper = styled.div`

.checkbox-btn {
  display: block;
  position: relative;
  padding-left: 30px;
  margin-bottom: 10px;
  cursor: pointer;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.checkbox-btn input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkbox-btn label {
  cursor: pointer;
  font-size: 14px;
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 25px;
  width: 25px;
  border: 2.5px solid #2e3138;
  transition: .2s linear;
}
.checkbox-btn input:checked ~ .checkmark {
  background-color: transparent;
}

.checkmark:after {
  content: "";
  position: absolute;
  visibility: hidden;
  opacity: 0;
  left: 50%;
  top: 40%;
  width: 10px;
  height: 14px;
  border: 2px solid #0ea021;
  filter: drop-shadow(0px 0px 10px #0ea021);
  border-width: 0 2.5px 2.5px 0;
  transition: .2s linear;
  transform: translate(-50%, -50%) rotate(-90deg) scale(0.2);
}

.checkbox-btn input:checked ~ .checkmark:after {
  visibility: visible;
  opacity: 1;
  transform: translate(-50%, -50%) rotate(0deg) scale(1);
  animation: pulse 1s ease-in;
}

.checkbox-btn input:checked ~ .checkmark {
  transform: rotate(45deg);
  border: none;
}

@keyframes pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) rotate(0deg) scale(1.6);
  }
}`;