import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useDispatch } from 'react-redux'
import { setSection } from '../redux/Slices/dateSlice'
import {
    ClipboardList,
    ChefHat,
    Truck,
    Target,
    Container,
    Menu, 
    PlusIcon
  } from "lucide-react";
import { cn } from './Utils';

const menuItems = [
    { icon: ClipboardList, label: "Filling", path:"Create-Data-Filling", section:"Filling" },
    { icon: ChefHat, label: "Kitchen", path:"Create-Data-Kitchen", section:"Kitchen"},
    { icon: Truck, label: "Dispatch", path:"Create-Data-Dispatch", section:"Dispatch"},
    { icon: Target, label: "Production Goal", path:"Production" },
    { icon: Container, label: "Exports", path:"Create-Exports"},
  ];

export const Navigation = ({ className }) => {

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      {isMobile && (
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="fixed z-50 top-[20%] left-2 p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-black/50 transition-colors duration-300"
        >
          <Menu className="w-6 h-6 text-primary" />
        </button>
      )}

      <div className={cn(
          "fixed z-40 left-0 h-[calc(100vh-64px)]",
          "md:w-24 md:hover:w-64",
          "w-full md:w-24",
          isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0',
          "bg-black/40 backdrop-blur-xl border-r border-white/10 p-4",
          "transition-all duration-[600ms] ease-in-out",
          "group/sidebar overflow-hidden",
          className
        )}
      >

        <nav className="h-full flex flex-col gap-4">

          <div className="flex items-center mx-2 gap-4 text-white/80 hover:text-white transition-colors duration-300 cursor-pointer">

          <div className="absolute top-5 right-4 bg-black m-4 opacity-100 group-hover/sidebar:opacity-0 transition-opacity">
            <PlusIcon className= {`${ !isMobile ? "w-8 h-8 text-white hover:hidden" : "hidden"}`}  />
          </div>

            <span className="whitespace-nowrap text-2xl mt-10 md:mb-12 mb-1 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-500">
              Create Data
            </span>
          </div>

          {
            menuItems.map((item,i) => (
            <div 
              key={i}
               className="w-full flex items-center space-x-10 p-4 cursor-pointer hover:space-x-14 rounded-lg bg-white/5 hover:bg-white/10 transition-all group"
              onClick={() =>{
                if (item.section){
                    dispatch(setSection(item.section));
                }
                navigate(`/admin/${item.path}`)
              }}
            >
              <item.icon className="w-7 h-7 text-primary group-hover:scale-110 transition-transform absolute" />
              <span className="whitespace-nowrap md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity duration-500">
                {item.label}
              </span>
            </div>
           ))
          }
        </nav>
      </div>
    </>
  );
};