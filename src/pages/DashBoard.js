import React, { useState , useEffect} from 'react'
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDispatch , useSelector } from 'react-redux'
import { setSection } from '../redux/Slices/dateSlice'
import {
  BarChart3,
  Package,
  FileText,
  Boxes
} from "lucide-react";
import { Navigation } from '../components/Navigation';

const cards = [
  { icon: FileText, label: "View Data" },
  { icon: BarChart3, label: "View Analytics" },
  { icon: Package, label: "View Inventory" },
  { icon: Boxes, label: "Raw Materials & MRP" },
];

const items = [
  [
    {name: "Filling Data", path: "Month", section:"Filling"},
    {name: "Kitchen Data", path: "Month", section:"Kitchen"},
    {name: "Dispatch Data", path: "Month", section:"Dispatch"},
    {name: "Costing", path: "Costing"},
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
  ],
  [
    {name: "Live Stock Ledger", path: "Raw-Materials"},
    {name: "Recipe Master & BOM", path: "Recipe-Master"},
    {name: "Purchase Planner (MRP)", path: "Purchase-Planner"},
    {name: "Perishable Alerts", path: "Perishable-Alerts"},
    {name: "Goods Receipt (GRN)", path: "Goods-Receipt"},
    {name: "Kitchen Issue & Variance", path: "Material-Issue"}
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
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row relative">
      <Navigation />

      <main className="flex-1 w-full md:ml-24 px-4 sm:px-8 lg:px-12 py-10 max-w-[1800px] mx-auto">
        {/* Header Banner */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
              Enterprise Control Center
            </span>
            <span className="text-zinc-500 text-xs sm:text-sm font-mono">• Central Production Suite</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Aliments Global Operations Portal
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base mt-2 max-w-3xl">
            Select an operational pillar below to review shift logs, analytics graphs, inventory ledgers, or MRP procurement engines.
          </p>
        </div>

        {/* 4 Pillar Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 w-full items-start">
          {cards.map((card, index) => {
            const isCardOpen = isOpen === card.label;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                onClick={() => setIsOpen(isCardOpen ? null : card.label)}
                className={`rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-xl ${
                  isCardOpen
                    ? "bg-[#111111]/95 border-primary/50 shadow-2xl shadow-primary/10 ring-1 ring-primary/20"
                    : "bg-[#0b0b0b]/90 border-white/10 hover:border-white/20 hover:bg-[#121212] shadow-lg"
                }`}
              >
                {/* Card Header */}
                <div className="p-6 flex flex-col items-center text-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all ${
                    isCardOpen ? "bg-primary text-black shadow-lg shadow-primary/20 scale-105" : "bg-white/5 border border-white/10 text-primary"
                  }`}>
                    <card.icon className="w-7 h-7" />
                  </div>

                  <h3 className={`text-lg font-bold tracking-tight transition-colors ${
                    isCardOpen ? "text-primary" : "text-white"
                  }`}>
                    {card.label}
                  </h3>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 font-mono">
                      {items[index].length} Modules
                    </span>
                    <span className="text-xs text-primary font-medium">
                      {isCardOpen ? "Click to collapse" : "Click to view"}
                    </span>
                  </div>
                </div>

                {/* Expanded Item List */}
                {isCardOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-5 pb-6 pt-2 border-t border-white/5 space-y-2.5"
                  >
                    {items[index].map((item, i) => (
                      <div
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.section) {
                            dispatch(setSection(item.section));
                          }
                          navigate(`/admin/${item.path}`);
                        }}
                        className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-primary hover:text-black border border-white/5 hover:border-primary text-zinc-200 font-medium text-sm transition-all duration-200 flex items-center justify-between group/item cursor-pointer shadow-sm"
                      >
                        <span className="group-hover/item:font-bold">{item.name}</span>
                        <span className="text-xs opacity-50 group-hover/item:opacity-100 transition-opacity font-mono">
                          →
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
};