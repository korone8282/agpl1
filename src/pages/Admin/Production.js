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
    <div>
            <div className="flex justify-center my-6 items-center space-x-4">
            <label className="text-lg text-muted-foreground">Plan for:</label>
            <input
              type="date"
              value={info.date}
              name='date'
              onChange={e => inputHandler(e)}
              className="border bg-[#22252a] border-border rounded-md px-3 py-1.5 text-md focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground shadow-md"
            />
          </div> 
    {
      loading ? (<Loader/> 
      ) : (
        <div className={`bg-[#22252a] text-white  p-6 rounded-lg shadow-lg w-full max-w-md z-30 h-fit inset-0 m-auto`}>
        <h2 className="text-xl font-semibold mb-4">Create Goal</h2>
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
                        onChange={ e => inputHandler(e) }
                        className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              /></div>

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
                <button type="button" className="bg-red-600 py-2 px-4 rounded hover:bg-red-500"
                        onClick={handleCreate}>Submit</button>
            </div>
        </div>
    </div>
      )
    }

      

    </div>
  )
}

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
