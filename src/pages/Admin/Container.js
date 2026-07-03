import React, {useState, useEffect} from 'react'
import { apiConnector } from '../../redux/Utils/apiConnector';
import {  EXPORT_URL } from '../../redux/Utils/constants';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader'
import { toast } from 'react-toastify';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import PageTransition from '../PageTransition';

const Container = () => {

  const {userinfo} = useSelector(state => state.auth);

  const [info] = useState({
    start:new Date(new Date().setDate(new Date().getDate() - 60)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
});

  const exportId = useLocation().pathname.split("/")[3];
  const navigate = useNavigate();

  const [loading, setLoading] = useState(1);
  const [error, setError] = useState(0);
  const [arr, setArr] = useState([]);
  const [array, setArray] = useState([]);

  useEffect(() => {
        
    async function getData(){
        try {
        setError(0);
        setLoading(1);
        
        const res = await apiConnector(`${EXPORT_URL}/${exportId}`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});
        setArr(res.data.data);

        setLoading(0);
        

        } catch (e) {
          setError(1);
          console.log(e);
        }
      }

      async function getInfo(){
        try {
        setError(0);
        setLoading(1);
        
        const res = await apiConnector(`${EXPORT_URL}/read`,"PUT",info,{Authorization: `Bearer ${userinfo.token}`});

        setArray(res.data.data);
      
        setLoading(0);
      
        } catch (e) {
          setError(1);
          console.log(e);
        }
      }
      
      getInfo();
      getData();

}, [userinfo.token,exportId,info]);

async function deleteExport(){
  try {
  setError(0);
  setLoading(1);
  
  await apiConnector(`${EXPORT_URL}/${exportId}`,"DELETE",null,{Authorization: `Bearer ${userinfo.token}`});
  toast("Deleted Successfully")
  navigate("/admin/Container-List");

  } catch (e) {
    setError(1);
    console.log(e);
  }
}

      return (
        <PageTransition>
           <div className="min-h-screen bg-background p-6">
          <div className="max-w-[100rem] mx-auto space-y-12 text-start">
    
    
          <div className="flex flex-col gap-6 justify-center items-center mb-6 md:flex-row md:justify-between md:mx-12">

          <div className="flex items-center gap-4">
            <div className="bg-red-600 rounded-lg px-6 hover:border-black text-lg p-2.5 mx-2 my-3 cursor-pointer hover:bg-orange-500 hover:text-black"
              onClick={deleteExport}>
              <span>Delete</span>
            </div>
</div>

              <div className="flex justify-start text-2xl"> Container Name: {arr.name}</div>

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
                    <TableHead>S No.</TableHead>
                    <TableHead>Buyer Name</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Pack Size (kg)</TableHead>
                    <TableHead>Pouch Goal</TableHead>
                    <TableHead>Pouch Filled</TableHead>
                    <TableHead>Pouch Packed</TableHead>
                    <TableHead>Pouch Wasted (Dispatch)</TableHead>
                    <TableHead>Remaining (By Filling)</TableHead>
                    <TableHead>Remaining (By Dispatch)</TableHead>
                  </TableRow>
                </TableHeader>
    

{
   arr && arr.list && arr.list.map((val,ind)=>(

    <TableBody>

      <TableRow key={ind} className={`${val.pouch - (array.filter( product => product.sectionMain === "Filling").reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.productName === val.productName && item.buyerName === val.buyerName && item.packSize === val.packSize && item.container === arr.name).reduce( (accumulator, object) => accumulator + object.pouchQuantity,0),0)) >= 0 ? "bg-red-600" : "bg-green-900" }`}>
        <TableCell>{ind+1} </TableCell>
        <TableCell>{val.buyerName} </TableCell>
        <TableCell>{val.productName} </TableCell>
        <TableCell>{val.packSize} </TableCell>
        <TableCell>{val.pouch} </TableCell>
        <TableCell>{array.filter( product => product.sectionMain === "Filling").reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.productName === val.productName && item.buyerName === val.buyerName && item.packSize === val.packSize && item.container === arr.name).reduce( (accumulator, object) => accumulator + object.pouchQuantity,0),0)} </TableCell>
        <TableCell>{array.filter( product => product.sectionMain === "Dispatch").reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.productName === val.productName && item.buyerName === val.buyerName && item.packSize === val.packSize && item.container === arr.name).reduce( (accumulator, object) => accumulator + object.pouchPacked,0),0)} </TableCell>
        <TableCell>{array.filter( product => product.sectionMain === "Dispatch").reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.productName === val.productName && item.buyerName === val.buyerName && item.packSize === val.packSize && item.container === arr.name).reduce( (accumulator, object) => accumulator + object.leaked,0),0)} </TableCell>
        <TableCell>{val.pouch - (array.filter( product => product.sectionMain === "Filling").reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.productName === val.productName && item.buyerName === val.buyerName && item.packSize === val.packSize && item.container === arr.name).reduce( (accumulator, object) => accumulator + object.pouchQuantity,0),0))} </TableCell>
        <TableCell>{val.pouch - (array.filter( product => product.sectionMain === "Dispatch").reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.productName === val.productName && item.buyerName === val.buyerName && item.packSize === val.packSize && item.container === arr.name).reduce( (accumulator, object) => accumulator + object.pouchPacked,0),0))} </TableCell>
      </TableRow>

      {
        array?.map((v)=>(
          v.dataList.filter(item=>item.productName === val.productName && item.buyerName === val.buyerName && item.packSize === val.packSize && item.container === arr.name).map((val,ind)=>(
          <TableRow key={ind} className="bg-slate-800">
            <TableCell>{v.createdAt.slice(5,10)}</TableCell>
            <TableCell>{val.buyerName}</TableCell>
            <TableCell>{val.productName}</TableCell>
            <TableCell>{val.packSize}</TableCell>
            <TableCell>{val.batch}</TableCell>
            <TableCell>{val.pouchQuantity}</TableCell>
            <TableCell>{val.pouchPacked}</TableCell>
            <TableCell>{val.leaked}</TableCell>
            <TableCell>-</TableCell>
            <TableCell>-</TableCell>
          </TableRow>

          ))
        ))
      }
      
    </TableBody>
    ))
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

export default Container
