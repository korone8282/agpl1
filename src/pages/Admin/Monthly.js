import React, {useState, useEffect} from 'react'
import Loader from '../../components/Loader';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/Popover";
import { Button } from "../../components/Buttons";
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { DATA_URL } from '../../redux/Utils/constants';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import PageTransition from '../PageTransition';

const Monthly = () => {

  const {userinfo} = useSelector(state => state.auth);

  const pSize = [0.125,0.13,0.175,0.2,0.22,0.225,0.25,0.3,0.35,0.375,0.4,0.45,0.5,0.6,1];

  const [data, setData] = useState([]);
  const [month, setmonth] = useState(1);
  const [loading, setLoading] = useState(1);
  const [error, setError] = useState(0);
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
              
                 useEffect(() => {
                  
                  async function getData(){
                    try {
                    setLoading(1);
                      setError(0);
                      const res = await apiConnector(`${DATA_URL}/List/${month}`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});
                      
                      setData(res.data.data);          
                      
                    setLoading(0);
                
                    } catch (e) {
                      setError(1);
                      console.log(e);
                    }
                  }

                  getData();
                 }, [month,userinfo.token]);

  let sum = 0;

  function myFunction(item) {
    let size = item;
    sum += ((item+0.005)*data.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.packSize === size).reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0),0))
  }

  return (
    <PageTransition>
       <div className="min-h-screen bg-background p-6">
      <div className="max-w-[100rem] mx-auto space-y-12 text-start">


        <div>
          <h2 className="text-xl font-semibold">Monthly Data For <span className='text-primary'>{months[month-1].month}</span> </h2>

          <div className="flex items-center gap-2 bg-card">
     <Popover open={isOpen} onOpenChange={setIsOpen}>
       <PopoverTrigger asChild>
         <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 my-5">
           Month
         </Button>
       </PopoverTrigger>
       <PopoverContent className="w-[280px] p-2 bg-card border-primary">
         <div className="grid grid-cols-3 gap-2">
           {months.map((month,index) => (
             <Button
               key={month.month}
               variant="ghost"
               onClick={()=>{
                setIsOpen(0)
                setmonth(index+1); 
               }}>
               {month.month}
             </Button>
           ))}
         </div>
       </PopoverContent>
     </Popover>
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
                <TableHead className="text-left">Pouch Size (Kg)</TableHead>
                <TableHead>No. Of Batches</TableHead>
                <TableHead>Yield (Kg)</TableHead>
                <TableHead>Pouch Filled</TableHead>
                <TableHead>Total (kg)</TableHead>
                <TableHead>Pouch Packed</TableHead>
                <TableHead>Pouch Wasted (Filling)</TableHead>
                 <TableHead>Pouch Wasted (Dispatch)</TableHead>
                <TableHead>Wastage (Kg)</TableHead>
                <TableHead>No. Of Box</TableHead>
                <TableHead>No. of Worker</TableHead>
              </TableRow>
            </TableHeader>

          <TableBody>
              {
                pSize.map((ele,index)=>(
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell>{ele}</TableCell>
                  <TableCell>{data.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.packSize === ele).reduce( (accumulator, obj) => accumulator + obj.batchQuantity,0),0)}</TableCell>
                  <TableCell>{data.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.packSize === ele).reduce( (accumulator, obj) => accumulator + obj.yield*obj.batchQuantity,0),0).toFixed(2)}</TableCell>
                  <TableCell>{data.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.packSize === ele).reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0),0)}</TableCell>
                  <TableCell>{((ele)*data.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.packSize === ele).reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0),0)).toFixed(2)}</TableCell>
                  <TableCell>{data.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.packSize === ele).reduce( (accumulator, obj) => accumulator + obj.pouchPacked,0),0)}</TableCell>
                  <TableCell>{ data.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.packSize === ele).reduce( (accumulator, obj) => accumulator + obj.empty,0),0) }</TableCell>
                  <TableCell>{
                    data.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.packSize === ele).reduce( (accumulator, obj) => accumulator + obj.leaked,0),0) +
                    data.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.packSize === ele).reduce( (accumulator, obj) => accumulator + obj.foreignMatter,0),0)}</TableCell>
                  <TableCell>{  data.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.packSize === ele).reduce( (accumulator, obj) => accumulator + obj.filled,0),0).toFixed(2) }</TableCell>
                  <TableCell>{data.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.packSize === ele).reduce( (accumulator, obj) => accumulator + obj.box,0),0)}</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium bg-muted/50">
                <TableCell>Total:</TableCell>
                <TableCell>{data.reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.batchQuantity,0),0)}</TableCell>
                <TableCell>{data.reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.yield*obj.batchQuantity,0),0).toFixed(2)}</TableCell>
                <TableCell>{ data.reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0),0)}</TableCell>
                <TableCell>{pSize.forEach(myFunction)} {sum.toFixed(2)}</TableCell>
                <TableCell>{data.reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.pouchPacked,0),0)}</TableCell>
                <TableCell>{data.reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.empty,0),0) }</TableCell>
                <TableCell>{
                  data.reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.leaked,0),0) +
                  data.reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.foreignMatter,0),0)
                }</TableCell>
                <TableCell>{data.reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.filled,0),0).toFixed(2)}</TableCell>
                <TableCell>{data.reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.box,0),0)}</TableCell>
                <TableCell>{data.reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj,index) => accumulator + (index===0?obj.workersQuantity:0),0),0)}</TableCell>
              </TableRow>
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

export default Monthly
