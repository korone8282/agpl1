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
          <div className={`min-h-screen bg-background p-6 `}>
      <div className="max-w-[95rem] mx-auto">
        <div className="mb-8 space-y-7">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-semibold text-foreground">Daily Goals</h1>
            <div className="flex items-center space-x-4">
              <label className="text-md text-muted-foreground">Updated At:</label>
              <span className="bg-[#25282d] px-3 py-1 rounded-md text-sm text-muted-foreground">
                {new Date().toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="text-lg text-muted-foreground">Plan for:</label>
            <input
              type="date"
              value={info.date}
              name='date'
              onChange={e =>{ 
                              inputHandler(e);
                              dispatch(setGoalDate(e.target.value));
                              window.location.reload();
                            }}
              className="border bg-[#22252a] border-border rounded-md px-3 py-1.5 text-md focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground shadow-md"
            />
          </div>
        </div>

{
  error ? (
<div className='text-center text-9xl'>No Data Found</div>
  ):(
  <div>
    {
      loading ? (<Loader/>
      ):(
        <div className={`flex flex-wrap justify-evenly ${openBox ? 'hidden' : ''} gap-20 max-w-[100rem]`}>
        {
          goals?.map((val,index)=>(
            <div 
                key={index}
                className="flex flex-col sm:flex-row gap-6 sm:gap-8 min-w-80 lg:gap-12 border-2 border-white/10 text-[#f59e0b] bg-[#22252a] rounded-lg p-4 sm:p-8 mx-0 sm:mx-2"
                onClick={()=>{
                  setopenBox(!openBox);
                  setcurrentGoal(val)}}
                >
                <div className="flex flex-col gap-1 text-xl sm:text-2xl justify-evenly font-bold sm:max-w-48">
                  <div className="text-white">Buyer Name:</div>
                  <div className="mb-2">{val.buyerName}</div>
                  <div className="text-white">Product Name:</div>
                  <div className="mb-2 break-words">{val.fname}</div>
                  <div className="text-white">Batch No:</div>
                  <div className="mb-2">{val.batchNum}</div>
                  <div className="text-white">Pack Size (Kg):</div>
                  <div className="mb-2">{val.pouchSize}</div>
                </div>

                <div className="flex flex-col items-center gap-6 w-full sm:w-auto">
                  <div className="flex w-[180px] sm:w-[200px] h-[180px] sm:h-[200px] justify-center items-center relative">
                  <div className="w-[110%] h-[110%] shadow-lg shadow-primary bg-transparent rounded-full absolute animate-spin_right"></div>                
                  <div className="w-[108%] h-[108%] shadow-lg shadow-violet-400 bg-transparent rounded-full absolute animate-spin_left"></div>
                  <div className="w-[106%] h-[106%] shadow-lg shadow-cyan-500 bg-transparent rounded-full absolute animate-spin_right_fast"></div>
                    <CircularSlider
                      label="Completion"
                      labelFontSize="1rem"
                      valueFontSize="2rem"
                      verticalOffset="0.5rem"
                      width={180}
                      labelColor="#f59e0b"
                      progressColorFrom="#00BCD4"
                      progressColorTo="#9C27B0"
                      hideKnob={true}
                      progressSize={20}
                      value={`${((val.pouchPacked / val.pouchGoal)*100).toFixed(2)}`}
                      appendToValue='%'
                      trackColor=""
                      trackSize={24}
                      initialValue={(val.pouchPacked / val.pouchGoal)*100}
                      knobDraggable={false}
                      dataIndex={(val.pouchPacked / val.pouchGoal)*360}
                    />
                  </div>

                  <div className="text-2xl sm:text-3xl mt-4 font-bold">
                    {val.pouchPacked} / {val.pouchGoal}
                  </div>

                  <div className="text-2xl sm:text-3xl font-bold -mt-3">
                    {val.day}
                  </div>
                </div>
              </div>
          ))
        }
        </div>
      )
    }
  </div>
  )
}
     

        {
            openBox ? (
              <div className={`bg-[#22252a] text-white mt-96 md:m-auto p-6 rounded-lg shadow-lg w-full max-w-md z-30 h-fit absolute inset-0 `}>
        <h2 className="text-xl font-semibold mb-4">Update Goal</h2>
        <div>
            <div className="mb-4">
                <label className="block text-muted-foreground mb-1">Buyer Name</label>
                <select
         name='buyerName'
             className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
         value={info.buyerName}
         onChange={ e => inputHandler(e) }
    >
    <option className=' bg-[#2e3138] text-muted-foreground '>Select</option>
    {
        categories.map((val,index)=>(<option className=' bg-[#2e3138] text-muted-foreground' value={val.name} key={index}>{val.name}</option>))
    }
    </select>
</div>
            <div className="mb-4">
                <label className="block text-muted-foreground mb-1">Product Name</label>
                <select
         name='fname'
           className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
         value={info.fname}
         onChange={ e => inputHandler(e) }
    >
    <option className=' bg-[#2e3138] text-muted-foreground'>Select</option>
    {
        products?.filter((product) => product.buyer === info.buyerName).map((val,index)=>(<option className=' bg-[#2e3138] text-muted-foreground' value={val.name} key={index}>{val.name}</option>))
    }
    </select>
</div>
            <div className="mb-4">
                <label className="block text-muted-foreground mb-1">Batch Number</label>
                <input  type='text' 
                        id="email" 
                        value={info.batchNum}
                        placeholder={currentGoal.batchNum}
                        name="batchNum" 
                        onChange={ e => inputHandler(e) }
                        className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        /> 
            </div>
            <div className="mb-4">
                <label className="block text-muted-foreground mb-1">Pouch Size</label>
                <input  type='number'
                        id="pass" 
                        value={info.pouchSize}
                        placeholder={currentGoal.pouchSize}
                        name='pouchSize'
                        onChange={ e => inputHandler(e) }
                        className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />

            </div>
            <div className="mb-4">
                <label className="block text-muted-foreground mb-1">Pouch Goal</label>
                <input  type='number'
                        id="confirmPassword" 
                        name = "pouchGoal" 
                        value={info.pouchGoal}
                        placeholder={currentGoal.pouchGoal}
                        onChange={ e => inputHandler(e) }
                        className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              /></div>
            <div className="mb-4">
                <label className="block text-muted-foreground mb-1">Pouch Packed</label>
                <input  type='number'
                        id="confirmPassword" 
                        name = "pouchPacked"
                        value={info.pouchPacked} 
                        onChange={ e => inputHandler(e) }
                        placeholder={currentGoal.pouchPacked}
                        className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />

</div>
            <div className="mb-6">
                <label className="block text-muted-foreground mb-3">Day/Night</label>
                <div className="flex items-center gap-12">

                <StyledWrapper>
      <label className="checkbox-btn">
        Day <label htmlFor="checkbox" />
        <input id="checkbox" type="checkbox" name='day' value="Day" onClick={e=>{inputHandler(e); document.getElementById('nightCheckbox').checked = false;}}/>
        <span className="checkmark" />
      </label>
               </StyledWrapper>

               <StyledWrapper>
      <label className="checkbox-btn">
         Night <label htmlFor="nightCheckbox" />
        <input id="nightCheckbox" type="checkbox" name='day' value="Night" onClick={e=>{inputHandler(e); document.getElementById('checkbox').checked = false;}}/>
        <span className="checkmark" />
      </label>
               </StyledWrapper>

                </div>
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" className="bg-[#2e3138] py-2 px-4 rounded hover:bg-gray-600" 
                        onClick={()=>setopenBox(!openBox)}>Cancel</button>
                <button type="button" className="bg-red-600 py-2 px-4 rounded hover:bg-red-500"
                        onClick={handleDelete}>Delete</button>
                <button type="submit" className="bg-primary text-black py-2 px-4 rounded hover:bg-yellow-400"
                        onClick={handleUpdate}>Update</button>
            </div>
        </div>
    </div>
            ) : (
              <div></div>
            )
          }

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