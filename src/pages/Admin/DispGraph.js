import React, {useState, useEffect} from 'react'
import Loader from '../../components/Loader';
import Wrapper from '../../components/Wrapper'
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { GRAPH_URL } from '../../redux/Utils/constants';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/Popover";
import { Button } from "../../components/Buttons";
import PageTransition from '../PageTransition';

const DispGraph = () => {

    const {userinfo} = useSelector(state => state.auth);

    const [month, setmonth] = useState(1);
    const [loading, setLoading] = useState(1);
    const [error, setError] = useState(0);
    const [arr,setArr] = useState([]);
    const [isOpen, setIsOpen] = useState(false)

    const months = React.useMemo(() => [
        {month:"January"},
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
       ], []);

    useEffect(() => {
                  
        async function getData(){
          try {
          setLoading(1);
            setError(0);

            const res = await apiConnector(`${GRAPH_URL}/${month}`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});

            res.data.data.forEach((e,i) => {
              const num =  e.filter(obj => obj.sectionMain === 'Dispatch').reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.pouchPacked,0),0);
              const worker =  e.filter(obj => obj.sectionMain === 'Dispatch').reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj,index) => accumulator + (index===0?obj.workersQuantity:0),0),0);
              arr.push({
                "name":i+1,
                "Pouches Packed":num,
                "Costing": (worker?(((worker*680)/num)*10000):0)
              })
            });
              
          setLoading(0);
      
          } catch (e) {
            setError(1);
            console.log(e);
          }
        }

        getData();
       }, [month,userinfo.token,arr]);

  return (
    <PageTransition>
         <div>

<div className='flex flex-col my-6 justify-center mx-5'>
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
               setmonth(index+1)
               setArr([])  
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
        error ? (
            <div className='sm:max-lg:mt-4 text-3xl font-bold text-center my-96'> No Data Entry Found For {months[month-1].month}</div>
        ):(
<div>
{
    loading ? (
        <Loader/>
    ):( 
      <Wrapper data={arr} dataKey={["Pouches Packed","Costing"]}/>
    )
}
</div>
        )
    }
    </div>
    </PageTransition>
 
  )
}

export default DispGraph
