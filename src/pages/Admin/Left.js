import React, { useEffect, useState } from 'react'
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { PRODUCT_URL, CATEGORIES_URL,  DATA_URL  } from '../../redux/Utils/constants';
import Loader from '../../components/Loader'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import {toast} from 'react-toastify';
import { Input } from "../../components/Input";
import { Search } from "lucide-react";
import PageTransition from '../PageTransition';

const Left = () => {

    const [data, setData] = useState([]);

    const [info, setInfo] = useState({
      start:"",
      end:"",
      buyer:"",
      product:"",
  });

    const [loading2, setLoading2] = useState(0);
    const [search, setsearch] = useState("");
    const [ogData, setogData] = useState([]);
    const [dummy, setdummy] = useState();
    const [products2, setproducts2] = useState([]);
    const [error, setError] = useState(0);
    const [products, setproducts] = useState([]);
    const [categories, setcategories] = useState([]); 

    const inputHandler = async(e) =>{
      setInfo((prevData) => ({
        ...prevData,
        [e.target.name]: e.target.value
      }));
    }

    const {userinfo} = useSelector(state=>state.auth);

    useEffect(() => {

        async function getProducts(){
            try {
      
          const res = await apiConnector(`${PRODUCT_URL}/products`,"GET");
          setproducts(res.data.data);
      
            } catch (error) {
              console.log(error);
            }
            }

    async function getCategories(){
            try {
          
          setError(0);
      
          const res = await apiConnector(`${CATEGORIES_URL}/categories`,"GET");
          setcategories(res.data.data);
      
            } catch (error) {
              setError(1)
              console.log(error);
            }
            }
        
      async function getData(){

  setLoading2(1);

    try {

      const res = await apiConnector(`${DATA_URL}/Left`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});
      setData(res.data.data);
      setogData(res.data.data);
      setdummy(res.data.data);
      setLoading2(0);

    } catch (error) {
      setLoading2(0);
      toast(error.response.data.message)
    }
  }
      
      getCategories();
      getProducts();
      getData();

      }, [userinfo.token]);

      function handleSearch(val) {

        if (val === ""){ 
          setData(dummy)
          return
          }

         setsearch(val);

         let filterBySearch = ogData.filter((item) => { 
          return item.sectionMain === "Dispatch" && item.dataList.filter((object) => {
                return object.batch.toLowerCase().startsWith(val.toLowerCase())
          }).length > 0
         })

         setogData(dummy)
         setData(filterBySearch); 
       }
       
 async function getDateData(){
        try {
        setError(0);
        setLoading2(1);
        
        const res = await apiConnector(`${DATA_URL}/DvN`,"PUT",info,{Authorization: `Bearer ${userinfo.token}`});

        setData(res.data.data);
        setogData(res.data.data);
        setdummy(res.data.data);

        setLoading2(0);
        

        } catch (e) {
          setError(1);
          console.log(e);
        }
      }

  return (
       <PageTransition>
         <div className="min-h-screen bg-background p-6">
          <div className="max-w-[100rem] mx-auto space-y-12 text-start">
  
  <div className="flex flex-col justify-center items-center mb-6 md:flex-row md:justify-between">

  <div className='flex gap-12 md:flex-row'>
      <div className="mb-4">
                      <label className="block text-muted-foreground mb-1">Buyer Name</label>
                      <select
              className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={ e =>{ 
                              setInfo((prevData) => ({
                                        ...prevData,
                                        buyer: e.target.value,
                                        product:""
                                      })); 
                                let p = products.filter(item => item.buyer === e.target.value)
                                console.log(p)
                                setproducts2(p)
                                }}
          >
          <option className=' bg-[#2e3138] text-muted-foreground '>Select</option>
          {
              categories.map((val,index)=>(<option className=' bg-[#2e3138] text-muted-foreground' 
                                                   key={index} 
                                                   value={val.name}> {val.name}</option>))
          }
          </select>
      </div>

      <div className="mb-4">
                      <label className="block text-muted-foreground mb-1">Product Name</label>
                      <select
              name='product'
              className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e)=>inputHandler(e)}
          >
          <option className=' bg-[#2e3138] text-muted-foreground'>Select</option>
          {
              products2?.filter((product) => product.buyer === info.buyer).map((val,index)=>(<option className=' bg-[#2e3138] text-muted-foreground' 
                                                                                                         value={val.name} 
                                                                                                         key={index}> {val.name}</option>))
          }
          </select>
      </div>
  </div>

              <div className="flex flex-col gap-4 md:flex-row md:gap-4 items-center">Start:
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
                /> :End
              </div>

              <div className="flex items-center gap-4">
            <div className="bg-[#1E1E1E] rounded-lg px-6 text-orange-500  border border-orange-500 hover:border-black text-lg p-2.5 mx-2 my-3 cursor-pointer hover:bg-orange-500 hover:text-black"
                 onClick={getDateData}>
              <span>Submit</span>
            </div>
</div>

        </div>

        <div className="relative mb-6 max-w-96 mx-auto">
              <Input
                type="text"
                placeholder="Search products..."
                onChange={(e)=>handleSearch(e.target.value)}
                className="bg-[#2A2A2A] border-none pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
    {
      error ? (<div className='sm:max-lg:mt-4 text-3xl font-bold text-center my-96'> No Data Entry Found</div>
      ):(
        <div>
          {
            loading2 ? (<Loader/>
            ):(
              <div className="rounded-lg border bg-card max-h-[35rem] overflow-auto">
            <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead>Date</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Buyer Name</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Batch Code</TableHead>
                    <TableHead>Pack Size</TableHead>
                    <TableHead>Pouch Packed</TableHead>
                    <TableHead>Pouch Leaked</TableHead>
                    <TableHead>Box</TableHead>
                  </TableRow>
                </TableHeader>
    
                {   
        data.length ? (
          <TableBody>
              {
                data.filter( obj => obj.sectionMain === "Dispatch").map(val=>(
          val.dataList.filter(object => {
            const matchesSearch = object.batch.toLowerCase().startsWith(search.toLowerCase());
            if (info.product) {
              return matchesSearch && object.productName === info.product;
            }
            else if (info.buyer) {
              return matchesSearch && object.buyerName === info.buyer;
            }
            return matchesSearch;
          }).map((row,i)=>(
                <TableRow key={i} className="hover:bg-muted/50">
                  <TableCell>{val.createdAt.substring(5,10).split('-').reverse().join('-')}</TableCell>
                  <TableCell>{val.dayTime}</TableCell>
                  <TableCell>{row.buyerName}</TableCell>
                  <TableCell>{row.productName}</TableCell>
                  <TableCell>{row.batch}</TableCell>
                  <TableCell>{row.packSize}</TableCell>
                  <TableCell>{row.pouchPacked}</TableCell>
                  <TableCell>{row.leaked}</TableCell>
                  <TableCell>{row.box}</TableCell>
                </TableRow>
              ))
            ))
          }
              <TableRow className="font-medium bg-muted/50">
                <TableCell colSpan={5}>Total:</TableCell>
                <TableCell>-</TableCell>
                <TableCell>{data.filter( obj => obj.sectionMain === "Dispatch").reduce((acc,obj)=> acc+obj.dataList.filter(object => {
            const matchesSearch = object.batch.toLowerCase().startsWith(search.toLowerCase());
            if (info.product) {
              return matchesSearch && object.productName === info.product;
            }
            else if (info.buyer) {
              return matchesSearch && object.buyerName === info.buyer;
            }
            return matchesSearch;
          }).reduce( (accumulator, object) => accumulator + (object.pouchPacked|| 0),0),0)}</TableCell>

                <TableCell>{data.filter( obj => obj.sectionMain === "Dispatch").reduce((acc,obj)=> acc+obj.dataList.filter(object => {
            const matchesSearch = object.batch.toLowerCase().startsWith(search.toLowerCase());
            if (info.product) {
              return matchesSearch && object.productName === info.product;
            }
            else if (info.buyer) {
              return matchesSearch && object.buyerName === info.buyer;
            }
            return matchesSearch;
          }).reduce( (accumulator, object) => accumulator + (object.leaked || 0),0),0)}</TableCell>

                <TableCell>{data.filter( obj => obj.sectionMain === "Dispatch").reduce((acc,obj)=> acc+obj.dataList.filter(object => {
            const matchesSearch = object.batch.toLowerCase().startsWith(search.toLowerCase());
            if (info.product) {
              return matchesSearch && object.productName === info.product;
            }
            else if (info.buyer) {
              return matchesSearch && object.buyerName === info.buyer;
            }
            return matchesSearch;
          }).reduce( (accumulator, object) => accumulator + (object.box || 0),0),0)}</TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableCell colSpan={4} className='font-bold text-md text-center'>No Data Entry Found</TableCell>)
        }
              </Table>
            </div>
            )
          }
        </div>
      )
    }
    
          </div>
        </div>
       </PageTransition>
      );
}

export default Left

