import React, {useState, useEffect} from 'react'
import Loader from '../../components/Loader';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { PRODUCT_URL,CATEGORIES_URL  } from '../../redux/Utils/constants';
import { DATA_URL } from '../../redux/Utils/constants';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import {toast} from 'react-toastify';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/Popover";
import { Button } from "../../components/Buttons";
import { Input } from "../../components/Input";
import PageTransition from '../PageTransition';


const Pouch = () => {

  const [sectionData, setSectionData] = useState([]);
  const [loading, setLoading] = useState(1);
  const [openBox2, setopenBox2] = useState(0);
  const [products, setproducts] = useState([]);
  const [error, setError] = useState(0);
  const [id, setId] = useState("");
  const [month, setmonth] = useState(1);
  const [categories, setcategories] = useState([]);
  const [info, setInfo] = useState({
      buyer:"",
      pouches:"",
      month:"",
      product:""
  });
  const [isOpen, setIsOpen] = useState(false)

const months = [{month:"January"},
                {month:"February"},
                {month:"March"},
                {month:"April"},
                {month:"May"},
                {month:"June"},
                {month:"July"},
                {month:"August"},
                {month:"September"},
                {month:"October"},
                {month:"November"},
                {month:"December"}
               ];

  const {userinfo} = useSelector(state => state.auth);

  async function handleUpdate(){
    try {
  
      await apiConnector(`${PRODUCT_URL}/updatePouch/${id}`,"PUT",info,{Authorization: `Bearer ${userinfo.token}`});
      setopenBox2(!openBox2);
      toast("Successfully Updated");
    } catch (error) {
      toast(error.response.data.message)
    }
  
  }
  
 
  useEffect(() => {

    async function getCategories(){
        try {
  
      const res = await apiConnector(`${CATEGORIES_URL}/categories`,"GET");
      setcategories(res.data.data);

        } catch (e) {
          console.log(e)
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
      
      async function getData(){
      try {
      setError(0);
      setLoading(1);
      
      const res = await apiConnector(`${DATA_URL}/List/${month}`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});

       setSectionData(res.data.data.map(e=>e.dataList.filter( buyer => buyer.buyerName === info.buyer)));

       setTimeout(()=>setLoading(0),100);
      

      } catch (e) {
        setError(1);
        console.log(e);
      }
    }
      
      getData();
      getProducts();
      getCategories();

    }, [info.buyer,month,userinfo.token]);

  const inputHandler = async(e) =>{
      setInfo((prevData) => ({
        ...prevData,
        [e.target.name]: e.target.value
      }));
    }

      return (
      <PageTransition>
          <div className="min-h-screen bg-background p-6">
          <div className="max-w-[100rem] mx-auto space-y-12 text-start">
  
  <div className="flex flex-col justify-center items-center mb-6 md:flex-row md:justify-between">

  <div className='flex gap-40 md:flex-row'>
      <div className="mb-4">
                      <label className="block text-muted-foreground mb-1">Buyer Name</label>
                      <select
              name='buyer'
              className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={ e => inputHandler(e) }
          >
          <option className=' bg-[#2e3138] text-muted-foreground '>Select</option>
          {
              categories.map((val,index)=>(<option className=' bg-[#2e3138] text-muted-foreground' 
                                                   key={index} 
                                                   value={val.name}> {val.name}</option>))
          }
          </select>
      </div>

      <div>
  <h2 className="text-xl font-semibold">Monthly Data For <span className='text-primary'>{months[month-1].month}</span> </h2>

  <div className="flex items-center gap-2 bg-card">
     <Popover open={isOpen} onOpenChange={setIsOpen}>
       <PopoverTrigger asChild>
         <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 my-5">
           Month
         </Button>
       </PopoverTrigger>
       <PopoverContent className="w-[280px] p-2 bg-card border-primary" onClick={() =>setIsOpen(0)}>
         <div className="grid grid-cols-3 gap-2">
           {months.map((month,index) => (
             <Button
               key={month.month}
               variant="ghost"
               onClick={()=>{
                setmonth(index+1);
                setInfo((prevData) => ({
                    ...prevData,
                    month: index+1
                  })); 
               }}>
               {month.month}
             </Button>
           ))}
         </div>
       </PopoverContent>
     </Popover>
   </div>
        </div>
  </div>

        </div>

    {
      error ? (<div className='sm:max-lg:mt-4 text-3xl font-bold text-center my-96'> No Data Entry Found</div>
      ):(
        <div>
          {
            loading ? (<Loader/>
            ):(
              <div className="rounded-lg border bg-card max-h-[35rem] overflow-auto">
            <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead>S. No.</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Previous Balance</TableHead>
                    <TableHead>Pouches (IN)</TableHead>
                    <TableHead>Pouch Filled</TableHead>
                    <TableHead>Waste Pouches</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Current Balance</TableHead>
                  </TableRow>
                </TableHeader>
    
          <TableBody>
              {
                products.filter(product=> product.buyer === info.buyer).map((element,i)=>(
                <TableRow key={i} 
                          className="hover:bg-muted/50"
                          onClick={()=>{
                            setopenBox2(!openBox2)
                            setId(element._id)
                            setInfo((prevData) => ({
                              ...prevData,
                              product:element.name
                            }))
                          }}>
                  <TableCell>{i+1}</TableCell>
                  <TableCell>{element.name}</TableCell>
                  <TableCell>{element.pouches.filter( item => item.month < month).reduce( (accumulator, obj) => accumulator + obj.remain,0)}</TableCell>
                  <TableCell>{element.pouches[month-1].stock}</TableCell>
                  <TableCell>{sectionData.reduce((acc,obj)=> acc+obj.filter(item=>item.productName === element.name).reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0),0)}</TableCell>
                  <TableCell>{sectionData.reduce((acc,obj)=> acc+obj.filter(item=>item.productName === element.name).reduce( (accumulator, obj) => accumulator + obj.empty,0),0)}</TableCell>
                  <TableCell>{element.pouches[month-1].stock - (sectionData.reduce((acc,obj)=> acc+obj.filter(item=>item.productName === element.name).reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0),0) + sectionData.reduce((acc,obj)=> acc+obj.filter(item=>item.productName === element.name).reduce( (accumulator, obj) => accumulator + obj.empty,0),0) )}</TableCell>
                  <TableCell>{element.pouches.filter( item => item.month <= month).reduce( (accumulator, obj) => accumulator + obj.remain,0)}</TableCell>
                </TableRow>
              ))
              }
            </TableBody>

              </Table>
            </div>
            )
          }
        </div>
      )
    }

{
            openBox2 ? (
      <div className="space-y-5 fixed h-fit inset-0 mx-auto top-40 bg-background p-5 shadow-black/70 shadow-2xl w-fit rounded-lg">
        <div className='flex justify-between items-center gap-3'>
          <label htmlFor="confirPassword" className='text-md'>
             Pouches 
          </label>
          <Input type='number'
                 id="confirmPassword" 
                 name = "pouches"
                 onChange={ e => inputHandler(e) }
                 className='border-2 border-[#f59e0b]'
                       />
        </div>

        <div className="flex justify-center gap-24">
          <button className=" py-2 px-4 rounded-lg text-[#f59e0b] bg-black border-[#f59e0b] border-2 font-semibold hover:scale-105"
          onClick={()=>setopenBox2(!openBox2)}> 
            Cancel
          </button>
          
          <button
          type='submit'
          onClick={handleUpdate}
              className=" py-2 px-4 rounded-lg text-black bg-primary border-black border-2 font-semibold hover:scale-105"
            >
              Update
            </button>
        </div>
      </div>

            ) : (
              null
            )
}

    
          </div>
        </div>
      </PageTransition>
      
      );
}

export default Pouch
