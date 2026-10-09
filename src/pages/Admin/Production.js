import React, {useState, useEffect} from 'react'
import { apiConnector } from '../../redux/Utils/apiConnector';
import Loader from '../../components/Loader';
import {toast} from 'react-toastify';
import { useSelector } from 'react-redux';
import { GOAL_URL } from '../../redux/Utils/constants'; 
import { CATEGORIES_URL  } from '../../redux/Utils/constants';
import { PRODUCT_URL } from '../../redux/Utils/constants';
import styled from 'styled-components';

const Production = () => {

    const {userinfo} = useSelector(state=>state.auth);

    const [products, setproducts] = useState([]);
    const [categories, setcategories] = useState([]);
    const [loading, setLoading] = useState(1);

    const [info, setInfo] = useState({
        buyerName:"",
        fname:"",
        batchNum:"",
        pouchSize:"",
        pouchGoal:"",
        pouchPacked:0,
        day:"",
        date:"",
    });

    useEffect(() => {

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

    }, []);
    
      const inputHandler = async(e) =>{
        setInfo((prevData) => ({
          ...prevData,
          [e.target.name]: e.target.value
        }));
      }

  async function handleCreate(){

    const toastId = toast.loading("Loading...",{
        position: 'top-center',
      });

    try {
        

      await apiConnector(`${GOAL_URL}`,"POST",info,{Authorization: `Bearer ${userinfo.token}`});
        
      setInfo({
        buyerName:"",
        fname:"",
        batchNum:"",
        pouchSize:"",
        pouchGoal:"",
        pouchPacked:0,
        day:info.day,
        date:"",
      });

      toast.dismiss(toastId);
      toast("created successfully");
      
    } catch (error) {
      toast.dismiss(toastId);
      toast("Fill Date and other Details");
    }
  }

  

  return (
    <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-white/10 pb-5 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
              <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                Shift Operations
              </span>
              <span className="text-zinc-500 text-xs font-mono">• Target Definition</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Create Production Goal
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Establish pouch packaging targets and shift parameters.
            </p>
          </div>

          <div className="flex items-center gap-2 justify-center sm:justify-end bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl">
            <label className="text-xs font-mono uppercase text-zinc-400">Date:</label>
            <input
              type="date"
              value={info.date}
              name="date"
              onChange={(e) => inputHandler(e)}
              className="bg-transparent border-0 text-white text-xs font-mono focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {loading ? (
          <Loader />
        ) : (
          <div className="bg-[#0d0d0d]/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
            <h2 className="text-lg font-bold text-white border-b border-white/5 pb-3">Goal Parameters</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Buyer Name
                </label>
                <select
                  name="buyerName"
                  className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary transition-all"
                  value={info.buyerName}
                  onChange={(e) => inputHandler(e)}
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Product Name
                </label>
                <select
                  name="fname"
                  className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary transition-all"
                  value={info.fname}
                  onChange={(e) => inputHandler(e)}
                >
                  <option value="">Select Product</option>
                  {products
                    ?.filter((product) => product.buyer === info.buyerName)
                    .map((val, index) => (
                      <option value={val.name} key={index}>
                        {val.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    id="email"
                    value={info.batchNum}
                    name="batchNum"
                    placeholder="e.g. B-2026-001"
                    onChange={(e) => inputHandler(e)}
                    className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary transition-all font-mono"
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
                    name="pouchSize"
                    placeholder="e.g. 0.258"
                    step="any"
                    onChange={(e) => inputHandler(e)}
                    className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Pouch Production Goal (Target Units)
                </label>
                <input
                  type="number"
                  id="confirmPassword"
                  name="pouchGoal"
                  value={info.pouchGoal}
                  placeholder="e.g. 5000"
                  onChange={(e) => inputHandler(e)}
                  className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary transition-all font-mono"
                />
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

              <div className="pt-3">
                <button
                  type="button"
                  className="w-full py-3 bg-primary hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-primary/20 cursor-pointer text-sm"
                  onClick={handleCreate}
                >
                  Create Production Target
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Production

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
