import { motion } from "framer-motion";
import { Button } from "../../components/Buttons";
import { Input } from "../../components/Input";
import { Search, Filter } from "lucide-react";
import React, { useEffect, useState } from 'react'
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { PRODUCT_URL, CATEGORIES_URL,  DATA_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader'
import {toast} from 'react-toastify';
import PageTransition from '../PageTransition';

const Index = () => {

  const [arr, setarr] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(1);
  const [loading2, setLoading2] = useState(0);
  const [error, setError] = useState(0);
  const [products, setproducts] = useState([]);
  const [ogData, setogData] = useState([]);
  const [dummy, setdummy] = useState();
  const [openBox, setopenBox] = useState(0);
  const [categories, setcategories] = useState([]); 
  const [info, setInfo] = useState({
      start:"",
      end:"",
      product:""
  });

  const {userinfo} = useSelector(state=>state.auth);

  useEffect(() => {

      async function getProducts(){
          try {
    
        const res = await apiConnector(`${PRODUCT_URL}/products`,"GET");
        setproducts(res.data.data);
        setogData(res.data.data);
        setdummy(res.data.data);
    
        setLoading(0);
          } catch (error) {
            console.log(error);
          }
          }

  async function getCategories(){
          try {
        
        setError(0);
    
        const res = await apiConnector(`${CATEGORIES_URL}/categories`,"GET");
        setcategories(res.data.data);
    
        setLoading(0);
          } catch (error) {
            setError(1)
            console.log(error);
          }
          }
    
    getCategories();
    getProducts();

    }, [userinfo.token]);

    function handleSearch(val) {

      if (val === ""){ 
        setproducts(dummy)
        return
        }

       let filterBySearch = ogData.filter((item) => {
           if (item.name.toLowerCase().startsWith(val.toLowerCase())){ 
             return item
            } else {
             return null 
            }
       })
       setogData(dummy)
       setproducts(filterBySearch); 
     }

const inputHandler = async(e) =>{
   setInfo((prevData) => ({
     ...prevData,
     [e.target.name]: e.target.value
   }));
 }

async function getData(){

 setLoading2(1)

 let array = []
 for (let q = new Date(info.start); q <= new Date(info.end); q = new Date(q.getTime() + 86400000)) {
   array.push(q.toISOString());
 }
 setarr(array)

   try {

     const res = await apiConnector(`${DATA_URL}/Product`,"PUT",info,{Authorization: `Bearer ${userinfo.token}`});
     setData(res.data.data);
     setLoading2(0);

   } catch (error) {
     setLoading2(0);
     toast(error.response.data.message)
   }
 }

  return (
    <PageTransition>
        <div>
      {
        error ? (<div className='sm:max-lg:mt-4 text-3xl font-bold text-center my-96'> No Data Entry Found</div>):(
          <div>
{
  loading ? (<Loader/>
  ) : (
    <div className="min-h-screen bg-[#121212] text-white p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <header className="flex justify-between items-center mb-8">
          <div>
            <div className="text-gray-400 text-xl">
              Production Management System
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-[#1E1E1E] rounded-lg px-6 text-orange-500  border border-orange-500 hover:border-black text-lg p-3 mx-2 cursor-pointer hover:bg-orange-500 hover:text-black"
                 onClick={()=>{
                  setarr([])
                  getData()}}>
              <span>Submit</span>
            </div>
          </div>
        </header>

{
  loading2 ? ( <Loader/>
  ) : (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1E1E1E] rounded-xl p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Product Details</h2>
              <Button variant="outline" className="bg-[#2A2A2A] border-orange-500/30 hover:bg-orange-500/10"
                      onClick={()=>setopenBox(!openBox)}>
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
            <div className="relative mb-6">
              <Input
                type="text"
                placeholder="Search products..."
                onChange={(e)=>handleSearch(e.target.value)}
                className="bg-[#2A2A2A] border-none pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
            <div className="overflow-y-auto max-h-[30rem] rounded-lg border border-orange-500/20">
              <table className="w-full">
                <thead className="bg-[#2A2A2A]">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-400">S No.</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-400">Buyer</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-400">Product Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-500/10">
                  {products.map((val,i) => (
                    <motion.tr 
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      onClick={(e)=>{
                      setInfo((prevData) => ({
                      ...prevData,
                      product: val
                       }));
                              }}
                      className="hover:bg-[#2A2A2A]/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm">{i+1}</td>
                      <td className="py-3 px-4 text-sm">{val.buyer}</td>
                      <td className="py-3 px-4 text-sm">{val.name}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#1E1E1E] rounded-xl p-6"
          >
            <div className="flex flex-col justify-center items-center mb-6 md:flex-row md:justify-between">
              <h2 className="text-xl font-semibold mb-4 md:mb-0">Production Overview</h2>
              <div className="flex flex-col gap-4 md:flex-row md:gap-4">
                <Input
                  type="date"
                  name="start"
                  onChange={ e => inputHandler(e) }
                  className="bg-[#2A2A2A] border-none"
                />
                <Input
                  type="date"
                  name='end'
                  onChange={ e => inputHandler(e) }
                  className="bg-[#2A2A2A] border-none"
                />
              </div>
            </div>

            <div className="text-center">
            <div>{info.product.name}</div>
            <div> ( {info.product.buyer} )</div>
            </div>

            <div className="overflow-y-auto max-h-[30rem] rounded-lg border my-4 border-orange-500/20">
              <table className="w-full">
                <thead className="bg-[#2A2A2A]">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-400">Date</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-400">Kitchen</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-400">Filling</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-400">Dispatch</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-400">Wastage</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-400">Box</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-500/10">
                  {arr?.map((val,i) => (
                    <motion.tr 
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-[#2A2A2A]/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm">{val?.substring(5,10)}</td>
                      <td className="py-3 px-4 text-sm">{data.filter(item=>item.createdAt === val).reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj) => accumulator + (obj.yield*obj.batchQuantity) ,0),0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm">{data.filter(item=>item.createdAt === val).reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0),0)}</td>
                      <td className="py-3 px-4 text-sm">{data.filter(item=>item.createdAt === val).reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj) => accumulator + obj.pouchPacked,0),0)}</td>
                      <td className="py-3 px-4 text-sm">{ 
      data.filter(item=>item.createdAt === val).reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj) => accumulator + obj.empty,0),0) +
      data.filter(item=>item.createdAt === val).reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj) => accumulator + obj.leaked,0),0) +
      data.filter(item=>item.createdAt === val).reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj) => accumulator + obj.foreignMatter,0),0)
    }</td>
                      <td className="py-3 px-4 text-sm">{ data.filter(item=>item.createdAt === val).reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj) => accumulator + obj.box,0),0)}</td>
                    </motion.tr>
                  ))}
                </tbody>

<tfoot>
  <tr className="bg-[#2A2A2A]">
      <td className='py-3 px-4 text-sm'>Total</td>
      <td className='py-3 px-4 text-sm'>{data.reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj) => accumulator + (obj.yield*obj.batchQuantity) ,0),0).toFixed(2)}</td>
      <td className='py-3 px-4 text-sm'>{data.reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj ) => accumulator + obj.pouchQuantity,0),0)}</td>
      <td className='py-3 px-4 text-sm'>{data.reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj) => accumulator + obj.pouchPacked,0),0)}</td>
      <td className='py-3 px-4 text-sm'>{ 
        data.reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj) => accumulator + obj.empty,0),0) +
        data.reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj) => accumulator + obj.leaked,0),0) +
        data.reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj) => accumulator + obj.foreignMatter,0),0)
      }</td>
      <td className='py-3 px-4 text-sm'>{ data.reduce((acc,obj)=> acc+obj.dataList.filter(object => object.productName === info.product.name && object.buyerName === info.product.buyer).reduce( (accumulator, obj) => accumulator + obj.box,0),0)}</td>
  </tr>
</tfoot>
              </table>
            </div>
          </motion.div>
        </div>
  )
}
        
      </motion.div>

{
    openBox ? (<div className={`absolute flex-col gap-3 bg-[#2A2A2A] text-sm max-h-80 overflow-auto sm:max-lg:left-[43rem] left-[38rem] max-w-60 top-[15rem] border-orange-500/30 border-2 rounded-lg p-2`}>
        {
            categories.map((val,ind)=>(
                <div className='flex items-center hover:bg-black hover:text-white rounded-md p-1'
                     key={ind}
                     name='product'
                     onClick={()=>{
                            let p = products.filter(item => item.buyer === val.name)
                            setproducts(p)
                            setopenBox(!openBox)}}>
                    - {val.name}
                </div>
           
            ))
        }
    </div>
    ) : null
}
    </div>
  )
}
          </div>
        )
      }
    </div>
    </PageTransition>

  );
};

export default Index;