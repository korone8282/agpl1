import React, {useState, useEffect} from 'react'
import { apiConnector } from '../../redux/Utils/apiConnector';
import { DISPATCH_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import { Input } from "../../components/Input";
import { useSelector } from 'react-redux';
import {toast} from 'react-toastify';
import PageTransition from '../PageTransition';

const DispatchReport = () => {

    const [loading, setLoading] = useState(0);
    const [data, setData] = useState([]);
    const [error, setError] = useState(0);

    const {userinfo} = useSelector(state=>state.auth);

    useEffect(() => {
          
async function getData(){

  setLoading(1);

    try {

      const res = await apiConnector(`${DISPATCH_URL}/dispatchReport`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});
      setData(res.data.data);
      setLoading(0);

    } catch (error) {
      setLoading(0);
      toast(error.response.data.message)
    }
  }
      
      getData();

      }, [userinfo.token]);

    const [info, setInfo] = useState({
        start:"",
        end:"",
    }); 

async function getReport(){
        try {
          setError(0);
          const res = await apiConnector(`${DISPATCH_URL}/dispatchDateReport`,"PUT",info,{Authorization: `Bearer ${userinfo.token}`});
          setData(res.data.data);
          setLoading(0);
        } catch (error) {
          setError(1);
          setLoading(0);
          toast(error.response.data.message);
        }
      }
    
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
                 onClick={getReport}>
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
              <div className="rounded-lg border bg-card max-h-[35rem] overflow-auto">
            <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead>Date</TableHead>
                    <TableHead>Buyer Name</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Pouch Dispatched</TableHead>
                    <TableHead>Box</TableHead>
                  </TableRow>
                </TableHeader>

  {   
data.length ? (
  <TableBody>
{
    data.map((val,ind)=>(
      <TableRow key={ind}>
        <TableCell>{val.lDate?.substring(0,10).split('-').reverse().join('-')}</TableCell>
        <TableCell>{val.buyerName} </TableCell>
        <TableCell>{val.productName} </TableCell>
        <TableCell>{val.pouchDispatched} </TableCell>
        <TableCell>{val.box} </TableCell>
      </TableRow>
    ))
  }
</TableBody>
) : (
  <TableCell colspan={4} className='text-3xl'>No Data Entry Found</TableCell>)
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

export default DispatchReport
