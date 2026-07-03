import React from 'react'
import { PRODUCT_URL, CATEGORIES_URL  } from '../../redux/Utils/constants';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useForm } from "react-hook-form";
import { useState , useEffect} from 'react';
import {toast} from 'react-toastify';
import Loader from '../../components/Loader';
import { useSelector } from 'react-redux';
import { Input } from "../../components/Input";
import PageTransition from '../PageTransition';

const Product = () => {

  const {userinfo} = useSelector(state=>state.auth);
  const [buyer, setBuyer] = useState("");
  const [products, setproducts] = useState([]);
  
  const { register, 
    handleSubmit,
    reset, 
    formState: {isSubmitSuccessful} 
  }  = useForm();
  
  const [openBox, setopenBox] = useState(0);
  const [categories, setcategories] = useState([]); 
  const [currentProduct, setcurrentProduct] = useState();
  const [loading, setLoading] = useState(1);

  useEffect(() => {

    async function getCategories(){
      try {

    const res = await apiConnector(`${CATEGORIES_URL}/categories`,"GET");
    setcategories(res.data.data);

    setLoading(0);
      } catch (error) {
        console.log(error);
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

    getCategories();
    getProducts();

    if(isSubmitSuccessful){
      reset({
        name:"",
        updatedName:"",
      })
    }
  }, [isSubmitSuccessful,reset]);



async function handleDelete(){
  try {
    
    await apiConnector(`${PRODUCT_URL}/${currentProduct._id}`,"DELETE",null,{Authorization: `Bearer ${userinfo.token}`});

    toast("deleted successfully");
    setcurrentProduct("");
    setopenBox(0);

  } catch (error) {
    console.log(error);
  }
}

async function handleCreate(data){
  try {

    await apiConnector(`${PRODUCT_URL}/${buyer}`,"POST",data,{Authorization: `Bearer ${userinfo.token}`});

    toast("created successfully");
    setcurrentProduct("");
    setopenBox(0);
    
  } catch (error) {
    console.log(error)
  }
}

const handleUpdate = async(data) =>{
  try {

    await apiConnector(`${PRODUCT_URL}/update/${currentProduct._id}`,"POST",data,{Authorization: `Bearer ${userinfo.token}`});

    toast("updated successfully");
    setcurrentProduct("");
    setopenBox(0);

  } catch (error) {
    console.log(error);
  }
}

  return (
    <PageTransition>
          <div className="justify-center flex flex-col md:flex-row">
    <div className="md:w-3/4 p-3">

    <div className="h-12 text-3xl my-4 text-center text-[#f59e0b]">Manage Products</div>

    <div className='flex gap-12'>
            <select
         name='buyerName'
             className="w-32 p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
         onChange={(e)=> setBuyer(e.target.value) }
    >
    <option className=' bg-[#2e3138] text-muted-foreground '>Select</option>
    {
        categories.map((val,index)=>(<option className=' bg-[#2e3138] text-muted-foreground' value={val.name} key={index}>{val.name}</option>))
    }
    </select>

            <Input className="py-3 px-4 border border-primary rounded-lg w-full"
           type='name' 
            {...register("name")}
            />
    </div>
    
      <br />
      <button 
      onClick={handleSubmit(data=>handleCreate(data))}
      className='my-6 md:mx-56 h-10 text-[#f59e0b] border-[#f59e0b] border-2 w-48 rounded-md hover:scale-105 text-xl'>Add</button>
      <hr className='mt-2'/>
 
    {
      loading ? (
        <Loader/>
      ) : (
        <div className="flex flex-wrap">
        {products?.filter(item => item.buyer === buyer).map((product) => (
          <div key={product._id}>
            <button
              className="py-2 px-4 rounded-lg m-3 text-[#f59e0b] border-[#f59e0b] border-2  hover:scale-105"
              onClick={() => {
                  setopenBox(true);
                  setcurrentProduct(product);
              }}
            >
              {product.name}
            </button>
          </div>
        ))}
      </div>
      )
    }
     
          
          {
            openBox ? (
              <div className="flex justify-center my-12">
      <div className="space-y-3">
        <Input
          type="name"
          {...register("updatedName")}
          className="py-3 px-4 border-2 border-primary rounded-lg w-full"
          placeholder= {`${currentProduct.name}`}
        />

        <div className="flex justify-between gap-4">
          <button className=" py-2 px-4 rounded-lg text-[#f59e0b] bg-black hover:scale-105"
          onClick={()=>setopenBox(0)}> 
            Cancel
          </button>
          
          <button
          type='submit'
          onClick={handleSubmit(data=>handleUpdate(data))}
              className=" py-2 px-4 rounded-lg text-black bg-primary hover:scale-105"
            >
              Update
            </button>

            <button
              onClick={handleDelete}
              className=" py-2 px-4 rounded-lg bg-red-600 hover:scale-105"
            >
              Delete
            </button>

        </div>
      </div>
    </div>
            ) : (
              <div className='text-lg'>Select To Update Or Delete</div>
            )
          }
    </div>
  </div>
    </PageTransition>

  )
}

export default Product