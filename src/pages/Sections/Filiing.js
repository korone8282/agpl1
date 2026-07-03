import React, { useEffect, useState } from 'react'
import DataLog from '../../components/DataLog'
import { apiConnector } from '../../redux/Utils/apiConnector';
import { DATA_URL } from '../../redux/Utils/constants';
import { useSelector } from 'react-redux';
import Loader from '../../components/Loader'
import { Sun, Moon } from "lucide-react";
import { Button } from "../../components/Buttons";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import PageTransition from '../PageTransition';

const Filiing = () => {

  const [isDayShift, setIsDayShift] = useState(true);

  const date = useSelector(state=>state.data);
  const dayArray = ["Day","Night"];
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(1);
  const [error, setError] = useState(0);

  const {userinfo} = useSelector(state=>state.auth);

  useEffect(() => {
    
    async function getData(){
      try {
        setError(0);
        const res = await apiConnector(`${DATA_URL}/${date.date}/${date.month}`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});
        setData(res.data.data);
        setLoading(0);
      } catch (error) {
        setError(1);
        console.log(error);
      }
    }

  getData();
  }, [date,userinfo.token]);

  const sectionData = data.length ? data.filter( item => item.sectionMain === "Filling" && item.dayTime === `${dayArray[+!isDayShift]}`) : [];

  return (
    <PageTransition>
          <div className="min-h-screen bg-background p-6">
      <div className="max-w-[100rem] mx-auto space-y-12 text-start">


        <div className="text-center">
          <h2 className="text-xl font-semibold">Daily Log for {date.date}-{date.month}-2026 </h2>
        </div>

    <div className='flex justify-center gap-10'>
        <DataLog/>

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
                <TableHead>Container</TableHead>
                <TableHead>Buyer Name</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Batch No.</TableHead>
                <TableHead>Pouch Size (kg)</TableHead>
                <TableHead>Pouch Produced</TableHead>
                <TableHead className="text-center" colSpan={2}>Wastage</TableHead>
                <TableHead>No. of Workers</TableHead>
                <TableHead>Cost/Pouch</TableHead>
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
              </TableRow>
            </TableHeader>

        {   
        sectionData.length ? (
          <TableBody>
              {
                sectionData[0]?.dataList.map((row,i) => (
                <TableRow key={row.sNo} className="hover:bg-muted/50">
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
                  <TableCell>{((row.workersQuantity*680)/(sectionData[0].dataList.reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0))).toFixed(3)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium bg-muted/50">
                <TableCell colSpan={6}>Total:</TableCell>
                <TableCell>{sectionData[0].dataList.reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0)}</TableCell>
                <TableCell>{sectionData[0].dataList.reduce( (accumulator, obj) => accumulator + obj.empty,0)}</TableCell>
                <TableCell>{(sectionData[0].dataList.reduce( (accumulator, obj) => accumulator + obj.filled,0)).toFixed(2)}</TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <div className='font-bold text-3xl mt-12 text-center'>No Data Entry Found</div>)
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

export default Filiing
