import React, {useState, useEffect} from 'react'
import { apiConnector } from '../../redux/Utils/apiConnector';
import { toast } from 'react-toastify';
import { DATA_URL, CATEGORIES_URL, PRODUCT_URL, EXPORT_URL } from '../../redux/Utils/constants';
import { setData, deleteData, emptyData } from '../../redux/Slices/localSlice';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate} from 'react-router-dom';
import { Sun, Moon, CheckCheck, Trash2, CirclePlus } from "lucide-react";
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
    <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full space-y-6 text-start">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                Data Entry Sheet
              </span>
              <span className="text-zinc-500 text-xs font-mono">• Filling & Retort Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Filling Shift Entry Log
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Record containers, pouch production counts, empty/filled pouch losses, and operator counts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl">
              <span className="text-xs text-zinc-400 font-mono uppercase">Date:</span>
              <input
                type="date"
                value={date.date}
                name="date"
                onChange={(e) => dispatch(setDate(e.target.value))}
                className="bg-transparent border-0 text-white text-xs font-mono focus:outline-none cursor-pointer"
              />
            </div>

            <Button
              variant="ghost"
              className={`w-10 h-10 p-0 rounded-xl border border-white/10 transition-all duration-300 relative overflow-hidden ${
                isDayShift ? "bg-amber-400/10 text-amber-400 border-amber-400/30" : "bg-indigo-400/10 text-indigo-400 border-indigo-400/30"
              }`}
              onClick={() => setIsDayShift(!isDayShift)}
              title={isDayShift ? "Day Shift Active" : "Night Shift Active"}
            >
              <div
                className={`transform transition-all duration-500 ${
                  isDayShift ? "rotate-0 scale-100" : "rotate-180 scale-0"
                } absolute inset-0 flex items-center justify-center`}
              >
                <Sun className="w-5 h-5 text-amber-400" />
              </div>
              <div
                className={`transform transition-all duration-500 ${
                  !isDayShift ? "rotate-0 scale-100" : "rotate-180 scale-0"
                } absolute inset-0 flex items-center justify-center`}
              >
                <Moon className="w-5 h-5 text-indigo-400" />
              </div>
            </Button>

            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-primary/20 transition-all cursor-pointer"
              onClick={() => {
                submitHandler();
                updater();
              }}
            >
              Submit Shift Sheet
            </button>
          </div>
        </div>

        {loading ? (
          <Loader />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto max-h-[44rem]">
              <Table>
                <TableHeader className="sticky top-0 z-20 bg-[#141414] border-b border-white/10 shadow-lg">
                  <TableRow className="bg-[#141414] hover:bg-[#141414] border-b border-white/10">
                    <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">#</TableHead>
                    <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Container</TableHead>
                    <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Buyer Name</TableHead>
                    <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Product Name</TableHead>
                    <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Batch No.</TableHead>
                    <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Size (kg)</TableHead>
                    <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Pouch Produced</TableHead>
                    <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Empty Loss</TableHead>
                    <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Filled Loss (Kg)</TableHead>
                    <TableHead className="bg-[#141414] text-zinc-400 text-xs font-mono py-3.5">Workers</TableHead>
                    <TableHead className="bg-[#141414] text-center text-xs font-mono py-3.5">Status</TableHead>
                    <TableHead className="bg-[#141414] text-center text-xs font-mono py-3.5">Remove</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {initalData[2]?.map((row, i) => (
                    <TableRow key={i} className="hover:bg-white/[0.03] border-b border-white/5 transition-colors">
                      <TableCell className="font-mono text-xs text-zinc-500 py-3">{i + 1}</TableCell>
                      <TableCell className="text-zinc-300 text-xs py-3">{row.container}</TableCell>
                      <TableCell className="text-zinc-300 text-xs py-3">{row.buyerName}</TableCell>
                      <TableCell className="text-white font-semibold text-xs py-3">{row.productName}</TableCell>
                      <TableCell className="font-mono text-xs text-zinc-200 py-3">{row.batch}</TableCell>
                      <TableCell className="font-mono text-xs text-zinc-300 py-3">{row.packSize}</TableCell>
                      <TableCell className="font-mono text-xs text-emerald-400 font-bold py-3">{row.pouchQuantity}</TableCell>
                      <TableCell className="font-mono text-xs text-amber-400 py-3">{row.empty}</TableCell>
                      <TableCell className="font-mono text-xs text-rose-400 py-3">{row.filled}</TableCell>
                      <TableCell className="font-mono text-xs text-zinc-300 py-3">{row.workersQuantity}</TableCell>
                      <TableCell className="py-3 text-center">
                        <CheckCheck className="h-5 w-5 mx-auto text-emerald-400" />
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <Trash2
                          className="h-4 w-4 mx-auto text-rose-400 hover:text-rose-300 cursor-pointer transition-colors"
                          onClick={() => deleteRow(i)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Add Row Form Inputs */}
                  <TableRow className="bg-white/[0.02] border-t-2 border-primary/30">
                    <TableCell className="py-3">
                      <CirclePlus className="h-5 w-5 text-primary" />
                    </TableCell>

                    <TableCell className="py-3">
                      <select
                        name="container"
                        className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-primary"
                        value={formData.container}
                        onChange={(e) => inputHandler(e)}
                      >
                        <option value="">Select</option>
                        {arr.map((val, index) => (
                          <option value={`${val.name}`} key={index}>
                            {val.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>

                    <TableCell className="py-3">
                      <select
                        name="buyerName"
                        className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-primary"
                        value={formData.buyerName}
                        onChange={(e) => {
                          inputHandler(e);
                          setbuyer(e.target.value.split("-")[1]);
                        }}
                      >
                        <option value="">Select Buyer</option>
                        {categories.map((val, index) => (
                          <option value={`${val._id}-${val.name}`} key={index}>
                            {val.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>

                    <TableCell className="py-3">
                      <select
                        name="productName"
                        className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-primary"
                        value={formData.productName}
                        onChange={(e) => inputHandler(e)}
                      >
                        <option value="">Select Product</option>
                        {products
                          ?.filter((product) => product.buyer === buyer)
                          .map((val, index) => (
                            <option value={val.name} key={index}>
                              {val.name}
                            </option>
                          ))}
                      </select>
                    </TableCell>

                    <TableCell className="py-3">
                      <Input
                        type="text"
                        placeholder="Batch"
                        name="batch"
                        value={formData.batch}
                        onChange={(e) => inputHandler(e)}
                        className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs font-mono focus:border-primary"
                      />
                    </TableCell>

                    <TableCell className="py-3">
                      <Input
                        type="number"
                        placeholder="Size"
                        name="packSize"
                        value={formData.packSize}
                        onChange={(e) => inputHandler(e)}
                        className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs font-mono focus:border-primary"
                      />
                    </TableCell>

                    <TableCell className="py-3">
                      <Input
                        type="number"
                        placeholder="Qty"
                        name="pouchQuantity"
                        value={formData.pouchQuantity}
                        onChange={(e) => inputHandler(e)}
                        className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs font-mono focus:border-primary"
                      />
                    </TableCell>

                    <TableCell className="py-3">
                      <Input
                        type="number"
                        placeholder="Empty"
                        name="empty"
                        value={formData.empty}
                        onChange={(e) => inputHandler(e)}
                        className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs font-mono focus:border-primary"
                      />
                    </TableCell>

                    <TableCell className="py-3">
                      <Input
                        type="number"
                        placeholder="Filled"
                        name="filled"
                        value={formData.filled}
                        onChange={(e) => inputHandler(e)}
                        className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs font-mono focus:border-primary"
                      />
                    </TableCell>

                    <TableCell className="py-3">
                      <Input
                        type="number"
                        placeholder="Workers"
                        name="workersQuantity"
                        value={formData.workersQuantity}
                        onChange={(e) => inputHandler(e)}
                        className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-white text-xs font-mono focus:border-primary"
                      />
                    </TableCell>

                    <TableCell className="py-3 text-center">
                      <button
                        type="button"
                        onClick={rowDataHandler}
                        className="px-3 py-1.5 bg-primary hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm"
                        title="Append batch row"
                      >
                        + Add
                      </button>
                    </TableCell>

                    <TableCell className="py-3 text-center text-xs text-zinc-600 font-mono">—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AllDataFilling
