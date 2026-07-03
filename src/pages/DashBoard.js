import React, { useState , useEffect} from 'react'
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDispatch , useSelector } from 'react-redux'
import { setSection } from '../redux/Slices/dateSlice'
import {
  BarChart3,
  Package,
  FileText,
} from "lucide-react";
import { Navigation } from '../components/Navigation';

const cards = [
  { icon: FileText, label: "View Data" },
  { icon: BarChart3, label: "View Analytics" },
  { icon: Package, label: "View Inventory" },
];

const items = [
  [
    {name: "Filling Data", path: "Month", section:"Filling"},
    {name: "Kitchen Data", path: "Month", section:"Kitchen"},
    {name: "Dispatch Data", path: "Month", section:"Dispatch"},
    {name: "Daily Wastage", path: "Daily-List"},
    {name: "Production Goals", path: "Production-Goal"}
  ],
  [
    {name: "Monthly Report", path: "Monthly-Data"},
    {name: "Buyer Data", path: "Product-Data"},
    {name: "Export Data", path: "Container-List"},
    {name: "Graph Report", path: "Graph"},
    {name: "Day Vs Night", path: "Day-Night"}
  ],
  [
    {name: "Pouch Stock", path: "Pouch"},
    {name: "Dispatch Stock", path: "Dispatched"},
    {name: "Product List", path: "ProductData"},
    {name: "Packed List", path: "Left"},
    {name: "Filling List", path: "Filling-List"}
  ]
]

export const Dashboard = () => {

  const [isOpen, setIsOpen] = useState(false);

  const {userinfo} = useSelector(state => state.auth);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
   
    if(!userinfo){
      navigate("/Login")
    }
  }, [userinfo,navigate]);

  return (
    <div className="min-h-screen flex justify-center">
  
     <Navigation/>

      <div className="flex flex-col md:flex-row gap-6 max-w-[90%] mx-6 md:gap-12 my-16 md:my-24 md:ml-28">
        {cards.map((card, index) => {
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                height: isOpen === card.label ? ( window.innerWidth < 768 ? "27rem" : "32rem" ) : "20rem"
              }}
              transition={{ 
                delay: index * 0.3,
                height: {
                  duration: 0.2,
                }
              }}
              onClick={() => setIsOpen(isOpen === card.label ? null : card.label)}
              className="w-[20rem] md:w-[22rem] rounded-2xl bg-secondary/30 backdrop-blur-lg p-4 md:p-8 flex flex-col items-center hover:bg-secondary/50 transition-all group cursor-pointer overflow-hidden"
              style={{
                justifyContent: isOpen === card.label ? "flex-start" : "center",
                paddingTop: isOpen === card.label ? "2rem" : "4rem",
              }}
            >
              <card.icon className="w-12 h-12 md:w-16 md:h-16 text-primary mb-4 md:mb-6 group-hover:scale-110 transition-transform" />
              <span className={`${ isOpen === card.label ? "text-primary" : "text-white"} text-lg md:text-xl font-medium mb-4`}>{card.label}</span>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isOpen === card.label ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-white/80 text-center w-full"
              >
                {isOpen === card.label && (
                  <div className="pt-4 md:pt-6 space-y-3 md:space-y-4">
                    {items[index].map((item, i) => (
                      <div key={i} className="p-2 text-base md:text-lg font-semibold hover:bg-white/10 rounded-lg transition-colors"
                        onClick={(e) => {
                         e.stopPropagation();
                         if (item.section) {
                           dispatch(setSection(item.section));
                         }
                         navigate(`/admin/${item.path}`);
                       }}>
                        {item.name}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};