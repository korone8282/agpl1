import React , {useState} from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setDate,setMonth,setDays,setSection } from '../redux/Slices/dateSlice';
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
 } from "./Popover";
 import { Button } from "./Buttons";

const DataLog = () => {

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [isOpen, setIsOpen] = useState(false)
  const [isOpen2, setIsOpen2] = useState(0);
  const [isOpen3, setIsOpen3] = useState(0);

  const data = useSelector(state=>state.data);

  const months = [{month:"January",days:31},
    {month:"February",days:28},
    {month:"March",days:31},
    {month:"April",days:30},
    {month:"May",days:31},
    {month:"June",days:30},
    {month:"July",days:31},
    {month:"August",days:31},
    {month:"September",days:30},
    {month:"October",days:31},
    {month:"November",days:30},
    {month:"December",days:31}
   ]

  return (
   <div className="flex items-center gap-8 justify-center">
   <div className="flex items-center gap-2 bg-card">
     <Popover open={isOpen} onOpenChange={setIsOpen}>
       <PopoverTrigger asChild>
         <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
           Sections
         </Button>
       </PopoverTrigger>
       <PopoverContent className="w-40 p-2 bg-card border-primary" onClick={() =>setIsOpen(0)}>
         <div className="flex flex-col gap-2">
           <Button
             variant="ghost"
             className={`justify-start`}
             onClick={()=>{
                dispatch(setSection("Kitchen"));
                navigate(`/admin/Kitchen/${data.month}`);  
               }}>
             Kitchen
           </Button>
           <Button
             variant="ghost"
             className={`justify-start`}
             onClick={()=>{
                dispatch(setSection("Filling"));
                navigate(`/admin/Filling/${data.month}`);  
               }}>
             Filling
           </Button>
           <Button
             variant="ghost"
             className={`justify-start`}
             onClick={()=>{
                dispatch(setSection("Dispatch"));
                navigate(`/admin/Dispatch/${data.month}`);  
               }}>
             Dispatch
           </Button>
         </div>
       </PopoverContent>
     </Popover>
   </div>

   <div className="flex items-center gap-2 bg-card">
     <Popover open={isOpen2} onOpenChange={setIsOpen2}>
       <PopoverTrigger asChild>
         <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
           Date
         </Button>
       </PopoverTrigger>
       <PopoverContent className="w-[280px] p-2 bg-card border-primary" onClick={() =>setIsOpen2(0)}>
         <div className="grid grid-cols-7 gap-2">
           {Array.from({ length: months[data.month-1].days }, (_, i) => i + 1).map((day) => (
             <Button
               key={day}
               variant="ghost"
               className={`w-8 h-8 p-0`}
               onClick={()=>{
                dispatch(setDate(day));
                navigate(`/admin/${data.section}/${data.month}`);
                }} 
             >
               {day}
             </Button>
           ))}
         </div>
       </PopoverContent>
     </Popover>
   </div>

   <div className="flex items-center gap-2 bg-card">
     <Popover open={isOpen3} onOpenChange={setIsOpen3}>
       <PopoverTrigger asChild>
         <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
           Month
         </Button>
       </PopoverTrigger>
       <PopoverContent className="w-[280px] p-2 bg-card border-primary" onClick={() =>setIsOpen3(0)}>
         <div className="grid grid-cols-3 gap-2">
           {months.map((month,index) => (
             <Button
               key={month.month}
               variant="ghost"
               onClick={()=>{
                dispatch(setMonth(index+1));
                dispatch(setDays(month.days));
                navigate(`/admin/${data.section}/${month.month}`);  
               }}>
               {month.month}
             </Button>
           ))}
         </div>
       </PopoverContent>
     </Popover>
   </div>
 </div>
  )
}

export default DataLog
