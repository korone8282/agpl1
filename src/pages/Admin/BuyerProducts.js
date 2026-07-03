import React, {useState, useEffect} from 'react'
import Loader from '../../components/Loader';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { CATEGORIES_URL  } from '../../redux/Utils/constants';
import { DATA_URL } from '../../redux/Utils/constants';
import { PRODUCT_URL } from '../../redux/Utils/constants';
import { Input } from "../../components/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import PageTransition from '../PageTransition';

const BuyerProducts = () => {


    const [sectionData, setSectionData] = useState([]);
    const [loading, setLoading] = useState(1);
    const [products, setproducts] = useState([]);
    const [error, setError] = useState(0);
    const [categories, setcategories] = useState([]);
    const [info, setInfo] = useState({
        start:"",
        end:"",
        buyer:"",
    });

    const {userinfo} = useSelector(state => state.auth);

      async function getData(){
        try {
        setError(0);
        setLoading(1);
        
          const res = await apiConnector(`${DATA_URL}/List`,"PUT",info,{Authorization: `Bearer ${userinfo.token}`});

         setSectionData(res.data.data.map(e=>e.dataList.filter( buyer => buyer.buyerName === info.buyer)));

        setLoading(0);
        

        } catch (e) {
          setError(1);
          console.log(e);
        }
      }
   
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

      return (
        <PageTransition>
      <div className="min-h-screen bg-background p-6">
          <div className="max-w-[100rem] mx-auto space-y-12 text-start">
    
    
          <div className="flex flex-col justify-center items-center mb-6 md:flex-row md:justify-between">
          <div className="mb-4">
                <label className="block text-muted-foreground mb-1">Buyer Name</label>
                <select
         name='buyer'
         className="w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
         onChange={ e => inputHandler(e) }
    >
    <option className=' bg-[#2e3138] text-muted-foreground '>Select</option>
    {
        categories.map((val,index)=>(<option className=' bg-[#2e3138] text-muted-foreground' value={val.name} key={index}>{val.name}</option>))
    }
    </select>
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
                 onClick={getData}>
              <span>Submit</span>
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
              <div className="rounded-lg border bg-card">
            <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="text-left">S No.</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>No. Of Batch</TableHead>
                    <TableHead>Production (kg)</TableHead>
                    <TableHead>Pouch Filled</TableHead>
                    <TableHead>Pouch Packed</TableHead>
                    <TableHead>Wastage</TableHead>
                    <TableHead>Box</TableHead>
                  </TableRow>
                </TableHeader>
    
              <TableBody>
                  {
                    products.filter(product=> product.buyer === info.buyer).map((element,index)=>(
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell>{index+1}</TableCell>
                      <TableCell>{element.name}</TableCell>
                      <TableCell>{sectionData.reduce((acc,obj)=> acc+obj.filter(item=>item.productName === element.name).reduce( (accumulator, object) => accumulator + object.batchQuantity,0),0)}</TableCell>
                      <TableCell>{sectionData.reduce((acc,obj)=> acc+obj.filter(item=>item.productName === element.name).reduce( (accumulator, obj) => accumulator + obj.yield*obj.batchQuantity,0),0).toFixed(2)}</TableCell>
                      <TableCell>{sectionData.reduce((acc,obj)=> acc+obj.filter(item=>item.productName === element.name).reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0),0)}</TableCell>
                      <TableCell>{sectionData.reduce((acc,obj)=> acc+obj.filter(item=>item.productName === element.name).reduce( (accumulator, obj) => accumulator + obj.pouchPacked,0),0)}</TableCell>
                      <TableCell>{
                        sectionData.reduce((acc,obj)=> acc+obj.filter(item=>item.productName === element.name).reduce( (accumulator, obj) => accumulator + obj.empty,0),0)
                      }</TableCell>
                      <TableCell>{ sectionData.reduce((acc,obj)=> acc+obj.filter(item=>item.productName === element.name).reduce( (accumulator, obj) => accumulator + obj.box,0),0)}</TableCell>
                 </TableRow>
                  ))}
                </TableBody>

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

export default BuyerProducts
