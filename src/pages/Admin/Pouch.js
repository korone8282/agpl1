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

const currentMonth = new Date().getMonth() + 1;

const Pouch = () => {

  const [sectionData, setSectionData] = useState([]);
  const [loading, setLoading] = useState(1);
  const [modalMode, setModalMode] = useState(null); // 'update' | 'add' | null
  const [products, setproducts] = useState([]);
  const [error, setError] = useState(0);
  const [id, setId] = useState("");
  const [month, setmonth] = useState(currentMonth);
  const [expandedId, setExpandedId] = useState(null);
  const [actionOpenId, setActionOpenId] = useState(null);
  const [categories, setcategories] = useState([]);
  const [info, setInfo] = useState({
      buyer:"",
      pouches:"",
      date:"",
      month: currentMonth,
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

  async function getProducts(){
    try {
      const res = await apiConnector(`${PRODUCT_URL}/products`,"GET");
      setproducts(res.data.data);
    } catch (error) {
      console.log(error);
    }
  }

  function openModal(mode, element) {
    setModalMode(mode);
    setId(element._id);
    setInfo((prevData) => ({
      ...prevData,
      product: element.name,
      pouches: mode === "update" ? String(element.pouches?.[month - 1]?.stock ?? "") : "",
      date: "",
      month,
    }));
    setActionOpenId(null);
  }

  async function handleSubmit(){
    try {
      if (!info.pouches && info.pouches !== 0) {
        toast("Enter pouch count");
        return;
      }
      if (modalMode === "add" && !info.date) {
        toast("Enter date");
        return;
      }

      await apiConnector(
        `${PRODUCT_URL}/updatePouch/${id}`,
        "PUT",
        { ...info, mode: modalMode },
        { Authorization: `Bearer ${userinfo.token}` }
      );
      setModalMode(null);
      toast(modalMode === "add" ? "Pouches added" : "Pouches (IN) updated");
      await getProducts();
    } catch (error) {
      toast(error.response?.data?.message || "Request failed")
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

      async function getData(){
      try {
      setError(0);
      setLoading(1);
      setExpandedId(null);

      const res = await apiConnector(`${DATA_URL}/List/${month}`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});

       setSectionData(
         (res.data.data || []).map((doc) => ({
           ...doc,
           dataList: (doc.dataList || []).filter((item) => item.buyerName === info.buyer),
         }))
       );

       setTimeout(()=>setLoading(0),100);

      } catch (e) {
        setSectionData([]);
        setLoading(0);
        if (e?.response?.status !== 404) {
          setError(1);
          console.log(e);
        }
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

  const getPrevBalance = (element) =>
    month <= 1 ? 0 : (Number(element.pouches?.[month - 2]?.remain) || 0);

  const getStockIn = (element) =>
    Number(element.pouches?.[month - 1]?.stock) || 0;

  const getStockEntries = (element) =>
    element.pouches?.[month - 1]?.entries || [];

  const toDateKey = (value) => {
    if (!value) return "";
    if (typeof value === "string" && value.length >= 10) return value.substring(0, 10);
    return new Date(value).toISOString().substring(0, 10);
  };

  const getProductItems = (productName) =>
    sectionData
      .filter((doc) => doc.sectionMain === "Filling")
      .flatMap((doc) =>
        (doc.dataList || [])
          .filter((item) => item.productName === productName)
          .map((item) => ({ ...item, createdAt: doc.createdAt }))
      );

  const getFilled = (productName) =>
    getProductItems(productName).reduce((acc, item) => acc + (Number(item.pouchQuantity) || 0), 0);

  const getWaste = (productName) =>
    getProductItems(productName).reduce((acc, item) => acc + (Number(item.empty) || 0), 0);

  const formatDateLabel = (dateKey) => {
    const [, m, d] = dateKey.split("-");
    return `${d}-${m}`;
  };

  // Merge filling + dated stock adds; highlight stock-in dates
  const getDateEntries = (element) => {
    const byDate = {};

    const ensure = (dateKey) => {
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          dateKey,
          stockIn: 0,
          filled: 0,
          waste: 0,
          hasStockIn: false,
          balance: 0,
        };
      }
      return byDate[dateKey];
    };

    sectionData
      .filter((doc) => doc.sectionMain === "Filling")
      .forEach((doc) => {
        const dateKey = toDateKey(doc.createdAt);
        const items = (doc.dataList || []).filter(
          (item) => item.productName === element.name
        );
        if (!items.length) return;

        const row = ensure(dateKey);
        items.forEach((item) => {
          row.filled += Number(item.pouchQuantity) || 0;
          row.waste += Number(item.empty) || 0;
        });
      });

    const stockEntries = getStockEntries(element);
    stockEntries.forEach((entry) => {
      const dateKey = toDateKey(entry.date);
      if (!dateKey) return;
      const row = ensure(dateKey);
      row.stockIn += Number(entry.quantity) || 0;
      row.hasStockIn = true;
    });

    const ascending = Object.values(byDate).sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey)
    );

    const datedStock = stockEntries.reduce(
      (acc, entry) => acc + (Number(entry.quantity) || 0),
      0
    );
    const undatedStock = Math.max(0, getStockIn(element) - datedStock);

    let running = getPrevBalance(element) + undatedStock;
    ascending.forEach((day) => {
      running += day.stockIn;
      running -= day.filled + day.waste;
      day.balance = running;
    });

    return ascending.slice().reverse();
  };

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
           {months.map((monthItem,index) => (
             <Button
               key={monthItem.month}
               variant="ghost"
               onClick={()=>{
                setmonth(index+1);
                setInfo((prevData) => ({
                    ...prevData,
                    month: index+1
                  })); 
               }}>
               {monthItem.month}
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
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
    
          <TableBody>
              {
                products.filter(product=> product.buyer === info.buyer).map((element,i)=>{
                  const isExpanded = expandedId === element._id;
                  const dateEntries = isExpanded ? getDateEntries(element) : [];
                  const prevBalance = getPrevBalance(element);
                  const stockIn = getStockIn(element);
                  const filled = getFilled(element.name);
                  const waste = getWaste(element.name);
                  const monthBalance = stockIn - filled - waste;
                  const currentBalance = prevBalance + monthBalance;

                  return (
                    <React.Fragment key={element._id || i}>
                <TableRow
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={()=>{
                            setExpandedId(isExpanded ? null : element._id);
                          }}>
                  <TableCell>{i+1}</TableCell>
                  <TableCell>{element.name}</TableCell>
                  <TableCell>{prevBalance}</TableCell>
                  <TableCell>{stockIn}</TableCell>
                  <TableCell>{filled}</TableCell>
                  <TableCell>{waste}</TableCell>
                  <TableCell>{monthBalance}</TableCell>
                  <TableCell>{currentBalance}</TableCell>
                  <TableCell onClick={(e)=>e.stopPropagation()}>
                    <Popover
                      open={actionOpenId === element._id}
                      onOpenChange={(open) => setActionOpenId(open ? element._id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-primary text-primary hover:bg-primary/10 h-8 px-2"
                        >
                          Action
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-36 p-1 bg-card border-primary" align="end">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            className="justify-start"
                            onClick={() => openModal("update", element)}
                          >
                            Update
                          </Button>
                          <Button
                            variant="ghost"
                            className="justify-start"
                            onClick={() => openModal("add", element)}
                          >
                            Add
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>

                {isExpanded && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={9} className="p-0">
                      <div className="px-6 py-3">
                        <div className="text-sm text-muted-foreground mb-2">
                          Entries by date (newest first) — opening stock for month: {prevBalance + stockIn}
                        </div>
                        {dateEntries.length === 0 ? (
                          <div className="text-sm py-2">No entries for this product in {months[month-1].month}</div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead>Date</TableHead>
                                <TableHead>Pouches (IN)</TableHead>
                                <TableHead>Pouch Filled</TableHead>
                                <TableHead>Waste Pouches</TableHead>
                                <TableHead>Balance</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dateEntries.map((day) => (
                                <TableRow
                                  key={day.dateKey}
                                  className={day.hasStockIn ? "bg-amber-500/20 hover:bg-amber-500/25" : ""}
                                >
                                  <TableCell>{formatDateLabel(day.dateKey)}</TableCell>
                                  <TableCell>{day.stockIn || "—"}</TableCell>
                                  <TableCell>{day.filled || "—"}</TableCell>
                                  <TableCell>{day.waste || "—"}</TableCell>
                                  <TableCell>{day.balance}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                    </React.Fragment>
                  );
                })
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
            modalMode ? (
      <div className="space-y-5 fixed h-fit inset-0 mx-auto top-40 bg-background p-5 shadow-black/70 shadow-2xl w-fit rounded-lg z-50 min-w-[18rem]">
        <div className="text-lg font-semibold text-primary">
          {modalMode === "add" ? "Add Pouches" : "Update Pouches (IN)"}
        </div>

        <div className='flex justify-between items-center gap-3'>
          <label htmlFor="pouchCount" className='text-md'>
             Pouches
          </label>
          <Input type='number'
                 id="pouchCount"
                 name = "pouches"
                 value={info.pouches}
                 onChange={ e => inputHandler(e) }
                 className='border-2 border-[#f59e0b]'
                       />
        </div>

        {modalMode === "add" && (
          <div className='flex justify-between items-center gap-3'>
            <label htmlFor="pouchDate" className='text-md'>
               Date
            </label>
            <Input type='date'
                   id="pouchDate"
                   name="date"
                   value={info.date}
                   onChange={ e => inputHandler(e) }
                   className='border-2 border-[#f59e0b]'
                         />
          </div>
        )}

        <div className="flex justify-center gap-24">
          <button className=" py-2 px-4 rounded-lg text-[#f59e0b] bg-black border-[#f59e0b] border-2 font-semibold hover:scale-105"
          onClick={()=>setModalMode(null)}> 
            Cancel
          </button>
          
          <button
          type='submit'
          onClick={handleSubmit}
              className=" py-2 px-4 rounded-lg text-black bg-primary border-black border-2 font-semibold hover:scale-105"
            >
              {modalMode === "add" ? "Add" : "Update"}
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
