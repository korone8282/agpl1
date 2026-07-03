import React, {useState, useEffect} from 'react'
import { apiConnector } from '../../redux/Utils/apiConnector';
import { toast } from 'react-toastify';
import { CATEGORIES_URL, PRODUCT_URL, EXPORT_URL } from '../../redux/Utils/constants';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import Loader from '../../components/Loader'
import { CheckCheck, Trash2, Check, CirclePlus } from "lucide-react";
import { Input } from "../../components/Input";
import { useSelector } from 'react-redux';
import PageTransition from '../PageTransition';

const Exports = () => {

  const [products, setproducts] = useState([]);
  const [categories, setcategories] = useState([]); 
  const [loading, setLoading] = useState(1);
  const [info, setInfo] = useState({
    buyerName:"",
    productName:"",
    pouch:"",
    packSize:"",
  });
  const [name, setName] = useState("C1");
  const [arr] = useState([]);
  
  const {userinfo} = useSelector(state=>state.auth)

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

      } catch (error) {
        console.log(error);
      }
      }

    getCategories();
    getProducts();

  }, []);

const inputHandler = async(e) =>{
        setInfo((prevData) => ({
          ...prevData,
          [e.target.name]: e.target.value
        }));
      }

  const submitHandler = async() =>{

    
    const toastId = toast.loading("Loading...",{
      position: 'top-center',
    }); 

   try {

    await apiConnector(`${EXPORT_URL}/${name}`,"POST",arr,{Authorization: `Bearer ${userinfo.token}`});

    toast.dismiss(toastId);
    toast("Successfully Submited");
    
    window.location.reload();
   } catch (error) {
    toast.dismiss(toastId);
    toast(error.response.data.message)
   }
  }

  const rowDataHandler = () =>{
    
   arr.push(info)

    setInfo({
        buyerName:"",
        productName:"",
        pouch:"",
        packSize:"",
  });

  }

const deleteHandler = (i) =>{
    
   arr.splice(i,1);

    setInfo({
        buyerName:"",
        productName:"",
        pouch:"",
        packSize:"",
  });

  }


  return (
  <PageTransition>
     <div className="min-h-screen bg-background p-6">

<div className="max-w-[100rem] mx-auto space-y-12 text-start">
<div className='my-8 rounded-xl w-full h-12 -mx-9 flex justify-around items-center'>

<div className="flex items-center space-x-4 mx-12">
     <label className="text-xl text-muted-foreground">Container Name</label>
     <Input
       type="name"
       onChange={ e => setName(e.target.value) }
       className="border bg-[#22252a] border-border rounded-md px-3 py-1.5 text-md focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground shadow-md"
     />
</div>

<div className="flex items-center gap-4">
           <div className="bg-[#1E1E1E] rounded-lg px-6 text-orange-500  border border-orange-500 hover:border-black text-lg p-3 mx-2 cursor-pointer hover:bg-orange-500 hover:text-black"
               onClick={submitHandler}>
             <span>Submit</span>
           </div>
</div>

</div>


{
 loading ? (<Loader/>
 ):(
   <div className="rounded-lg border bg-card">
 <Table>
     <TableHeader>
       <TableRow className="bg-muted/60">
         <TableHead className="text-left">S No.</TableHead>
         <TableHead>Buyer Name</TableHead>
         <TableHead>Product Name</TableHead>
         <TableHead>Pouch Size (kg)</TableHead>
         <TableHead>Required Pouches</TableHead>
         <TableHead>Remarks</TableHead>
         <TableHead>Delete</TableHead>
       </TableRow>
     </TableHeader>

   <TableBody>
       {
         arr?.map((row,i) => (
         <TableRow key={i} className="hover:bg-muted/50">
           <TableCell>{i+1}</TableCell>
           <TableCell>{row.buyerName}</TableCell>
           <TableCell>{row.productName}</TableCell>
           <TableCell>{row.packSize}</TableCell>
           <TableCell>{row.pouch}</TableCell>
           <TableCell><CheckCheck className='h-6 w-6 mx-auto' color='#13c952'/></TableCell>
           <TableCell><Trash2 className='h-6 w-6' color="#e01010" onClick={()=>deleteHandler(i)}/></TableCell>
         </TableRow>
       ))}

       <TableRow className="hover:bg-muted/50">
       <TableCell><CirclePlus className='h-5 w-5' color='#06a73f'/></TableCell>
           <TableCell> <select
            className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            name='buyerName'
            value={info.buyerName}
            onChange={ e => inputHandler(e)}
   >
   <option selected={true} className=' bg-[#2e3138] text-muted-foreground'>Select</option>
   {
       categories.map((val,index)=>(<option className=' bg-[#2e3138] text-muted-foreground' value={`${val.name}`} key={index}>{val.name}</option>))
   }
   </select> </TableCell>

           <TableCell>  <select
          name='productName'
          className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={info.productName}
          onChange={ e => inputHandler(e) }
   >
   <option selected={true} className=' bg-[#2e3138] text-muted-foreground'>Select</option>
   {
     products?.filter((product) => product.buyer === info.buyerName).map((val,index)=>(<option className=' bg-[#2e3138] text-muted-foreground' value={val.name} key={index}>{val.name}</option>))
   }
   </select> </TableCell>

           <TableCell> <Input type='number'
                name='packSize'
                value={info.packSize}
                onChange={ e => inputHandler(e) }
           ></Input> </TableCell>

           <TableCell> <Input type='number'
                 name='pouch'
                 value={info.pouch}
                onChange={ e => inputHandler(e) }
           ></Input> </TableCell>

           <TableCell><Check className="w-6 h-6 mx-auto hover:bg-gray-700" 
                             color="#e01010"
                             onClick={rowDataHandler}
                             /></TableCell>
           <TableCell>---</TableCell>
         </TableRow>
     </TableBody>
           
 

   </Table>
 </div>
 )
}
 </div>

   </div>
  </PageTransition>
   
  )
}

export default Exports
