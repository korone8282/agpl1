import React, {useState, useEffect} from 'react'
import { apiConnector } from '../../redux/Utils/apiConnector';
import { toast } from 'react-toastify';
import { DATA_URL, CATEGORIES_URL, PRODUCT_URL, EXPORT_URL } from '../../redux/Utils/constants';
import { setData, deleteData, emptyData } from '../../redux/Slices/localSlice';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate} from 'react-router-dom';
import { Sun, Moon,CheckCheck, Trash2, Check, CirclePlus } from "lucide-react";
import { Button } from "../../components/Buttons";
import { Input } from "../../components/Input";
import { setDate} from '../../redux/Slices/dateSlice';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import Loader from '../../components/Loader'

const AllDataFilling = () => {
  
  const section = useLocation();

  const [products, setproducts] = useState([]);
  const [buyer, setbuyer] = useState("");
  const [arr, setArr] = useState([]);
  const [loading, setLoading] = useState(1);

  const [isDayShift, setIsDayShift] = useState(true);
  const dayArray = ["Day","Night"];

  const date = useSelector(state=>state.data);

  const currentSection = section.pathname.split("/")[2].split("-")[2];

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [categories, setcategories] = useState([]); 

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

      async function getData(){
        try {
        setLoading(1);
        
        const res = await apiConnector(`${EXPORT_URL}/list`,"GET");
        setArr(res.data.data);

        setLoading(0);
        

        } catch (e) {
          console.log(e);
        }
      }

    getData();
    getCategories();
    getProducts();
  }, []);

  const val = 2;

  const initalData = useSelector(state=>state.local);

  const [formData, setformData] = useState({
  section:"",
  batch:"",
  container:"",
  buyer:"",
  buyerName:"",
  productName:"",
  batchQuantity:"",
  batchSize:"",
  yield:"",
  yieldLoss:"",
  workersQuantity:"",
  retortCycle:"",
  pouchPerCycle:"",
  empty:"",
  filled:"",
  pouchPacked:"",
  box:"",
  packSize:"",
  pouchQuantity:"",
  pouchLoss:"",
  leaked:"",
  foreignMatter:"",
  });

  const {userinfo} = useSelector(state=>state.auth);

  const updater = async() =>{
    try {
    await apiConnector(`${PRODUCT_URL}/dispUpdater`, "GET",null, {Authorization: `Bearer ${userinfo.token}`})
    
  } catch (error) {
    console.log(error)
  }}

  const submitHandler = async() =>{
    
    const toastId = toast.loading("Loading...",{
      position: 'top-center',
    });


   try {

    await apiConnector(`${DATA_URL}/Filling_${date.date}/${dayArray[+!isDayShift]}`,"POST",initalData[val],{Authorization: `Bearer ${userinfo.token}`});

    dispatch(emptyData(val));

    toast.dismiss(toastId);
    toast("Successfully Submited");
    
    navigate("/");
   } catch (error) {
    toast.dismiss(toastId); 
    toast(error.response.data.message)
   }
  }

  const inputHandler = async(e) =>{
    setformData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value
    }));
  }

  const rowDataHandler = () =>{

    formData.section = currentSection;
    formData.buyer = formData.buyerName.split("-")[0];
    formData.buyerName = formData.buyerName.split("-")[1];
    
    dispatch(setData({formData,val}));
    
    setformData((prevData) => ({
      ...prevData,
    container:"",
    buyer:"",
    buyerName:"",
    batch:"",
    productName:"",
    batchQuantity:"",
    batchSize:"",
    yield:"",
    yieldLoss:"",
    retortCycle:"",
    pouchPerCycle:"",
    empty:"",
    filled:"",
    pouchPacked:"",
    box:"",
    packSize:"",
    pouchQuantity:"",
    pouchLoss:"",
    leaked:"",
    foreignMatter:"",
}));

  }

  function deleteRow(index){
    dispatch(deleteData({val,index}));  
  }

  return (
    <div className="min-h-screen bg-background p-6">

 <div className="max-w-[100rem] mx-auto space-y-12 text-start flex flex-col gap-10 md:gap-0">
 <div className='my-8 rounded-xl w-full h-12 flex justify-around items-center flex-wrap gap-6'>

<div className="flex items-center space-x-4 mx-12">
      <label className="text-lg text-muted-foreground">DataSheet for:</label>
      <input
        type="date"
        value={date.date}
        name='date'
        onChange={(e)=>dispatch(setDate(e.target.value))}
        className="border bg-[#22252a] border-border rounded-md px-3 py-1.5 text-md focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground shadow-md"
      />
</div>

<Button
  variant="ghost"
  className={`w-12 h-12 p-0 rounded-full hover:bg-primary/20 transition-all duration-300 relative overflow-hidden ${
  isDayShift ? 'bg-amber-400/10' : 'bg-blue-400/10'
  }`}
  onClick={() => setIsDayShift(!isDayShift)}
  >
  <div className={`transform transition-all duration-500 ${
  isDayShift ? 'rotate-0 scale-100' : 'rotate-180 scale-0'
  } absolute inset-0 flex items-center justify-center`}>
  <Sun className={`w-6 h-6 ${
  isDayShift ? 'text-amber-400' : 'text-blue-400'
  }`} />
  </div>
  <div className={`transform transition-all duration-500 ${
  !isDayShift ? 'rotate-0 scale-100' : 'rotate-180 scale-0'
  } absolute inset-0 flex items-center justify-center`}>
  <Moon className={`w-6 h-6 ${
  !isDayShift ? 'text-blue-400' : 'text-amber-400'
  }`} />
  </div>
</Button>


<div className="flex items-center gap-4">
            <div className="bg-[#1E1E1E] rounded-lg px-6 text-orange-500  border border-orange-500 hover:border-black text-lg p-2.5 mx-2 cursor-pointer hover:bg-orange-500 hover:text-black"
                onClick={()=>{
          submitHandler()
          updater()}}>
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
          <TableHead>Container</TableHead>
          <TableHead>Buyer Name</TableHead>
          <TableHead>Product Name</TableHead>
          <TableHead>Batch No.</TableHead>
          <TableHead>Pouch Size (kg)</TableHead>
          <TableHead>Pouch Produced</TableHead>
          <TableHead className="text-center" colSpan={2}>Wastage</TableHead>
          <TableHead>No. of Workers</TableHead>
          <TableHead>Remarks</TableHead>
          <TableHead>Delete</TableHead>
        </TableRow>
        <TableRow className="bg-muted/40">
          <TableHead></TableHead>
          <TableHead></TableHead>
          <TableHead></TableHead>
          <TableHead></TableHead>
          <TableHead></TableHead>
          <TableHead></TableHead>
          <TableHead></TableHead>
          <TableHead>Pouch</TableHead>
          <TableHead>Item (Kg)</TableHead>
          <TableHead></TableHead>
          <TableHead></TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>

    <TableBody>
        {
          initalData[2]?.map((row,i) => (
          <TableRow key={i} className="hover:bg-muted/50">
            <TableCell>{i+1}</TableCell>
            <TableCell>{row.container}</TableCell>
            <TableCell>{row.buyerName}</TableCell>
            <TableCell>{row.productName}</TableCell>
            <TableCell>{row.batch}</TableCell>
            <TableCell>{row.packSize}</TableCell>
            <TableCell>{row.pouchQuantity}</TableCell>
            <TableCell>{row.empty}</TableCell>
            <TableCell>{row.filled}</TableCell>
            <TableCell>{row.workersQuantity}</TableCell>
            <TableCell><CheckCheck className='h-6 w-6 mx-auto' color='#13c952'/></TableCell>
            <TableCell><Trash2 className='h-6 w-6' color="#e01010" onClick={()=>deleteRow(i)}/></TableCell>
          </TableRow>
        ))}

        <TableRow className="hover:bg-muted/50">
        <TableCell><CirclePlus className='h-5 w-5' color='#06a73f'/></TableCell>
        <TableCell> <select
             name='container'
             className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
             value={formData.container}
             onChange={ e => inputHandler(e) }
    >
    <option className=' bg-[#2e3138] text-muted-foreground'>Select</option>
    {
        arr.map((val,index)=>(<option className=' bg-[#2e3138] text-muted-foreground' value={`${val.name}`} key={index}>{val.name}</option>))
    }
    </select> </TableCell>

            <TableCell> <select
             name='buyerName'
             className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
             value={formData.buyerName}
                 onChange={ e =>{
                   inputHandler(e) 
                   setbuyer(e.target.value.split("-")[1])
                   }}
    >
    <option className=' bg-[#2e3138] text-muted-foreground'>Select</option>
    {
        categories.map((val,index)=>(<option className=' bg-[#2e3138] text-muted-foreground' value={`${val._id}-${val.name}`} key={index}>{val.name}</option>))
    }
    </select> </TableCell>

            <TableCell>  <select
           name='productName'
           className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
           value={formData.productName}
           onChange={ e => inputHandler(e) }
    >
    <option className=' bg-[#2e3138] text-muted-foreground'>Select</option>
    {
      products?.filter((product) => product.buyer === buyer).map((val,index)=>(<option className=' bg-[#2e3138] text-muted-foreground' value={val.name} key={index}>{val.name}</option>))
    }
    </select> </TableCell>

            <TableCell> <Input type='text'
                 name='batch'
                 value={formData.batch}
                 onChange={ e => inputHandler(e) }
            ></Input> </TableCell>

            <TableCell> <Input type='number'
                 name='packSize'
                 value={formData.packSize}
                 onChange={ e => inputHandler(e) }
            ></Input> </TableCell>

            <TableCell><Input type='number'
                 name='pouchQuantity'
                 value={formData.pouchQuantity}
                 onChange={ e => inputHandler(e) }
            ></Input> </TableCell>

            <TableCell><Input type='number'
                 value={formData.empty}
                 name='empty'
                 onChange={ e => inputHandler(e) }
            ></Input> </TableCell>

            <TableCell><Input type='number'
                 value={formData.filled}
                 name='filled'
                 onChange={ e => inputHandler(e) }
            ></Input> </TableCell>

            <TableCell><Input type='number'
                 name='workersQuantity'
                 value={formData.workersQuantity}
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
  )
}

export default AllDataFilling
