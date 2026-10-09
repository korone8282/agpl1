import React from 'react'
import { useNavigate } from 'react-router-dom';
import { Truck, Cylinder, Flame, ArrowUpRight, BarChart3 } from "lucide-react";
import PageTransition from '../PageTransition';

const Graph = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Dispatch Analytics",
      route: "Dispatch-Graph",
      desc: "Daily trend of packaged pouches vs unit labor costing across months.",
      icon: Truck,
      color: "text-amber-400",
      border: "hover:border-amber-400/40",
      badge: "Packaging",
    },
    {
      title: "Filling Analytics",
      route: "Filling-Graph",
      desc: "Daily pouches filled, retorting output, and labor cost efficiency.",
      icon: Cylinder,
      color: "text-emerald-400",
      border: "hover:border-emerald-400/40",
      badge: "Retort & Fill",
    },
    {
      title: "Kitchen Analytics",
      route: "Kitchen-Graph",
      desc: "Batch production volume in kg versus labor cost per kilogram.",
      icon: Flame,
      color: "text-rose-400",
      border: "hover:border-rose-400/40",
      badge: "Cooking Yield",
    },
  ];

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full space-y-8 text-start">
          {/* Header Bar */}
          <div className="border-b border-white/10 pb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                Visual Intelligence
              </span>
              <span className="text-zinc-500 text-xs font-mono">• Section Throughput & Unit Cost Trends</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-primary" />
              Operational Cost & Yield Graphs
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Select an operational section to inspect daily output volumes correlated with dynamic labor cost per unit.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {sections.map((section, ind) => {
              const Icon = section.icon;
              return (
                <div
                  key={ind}
                  onClick={() => navigate(section.route)}
                  className={`group cursor-pointer rounded-2xl border border-white/10 bg-[#0d0d0d]/80 hover:bg-[#141414] p-6 transition-all duration-300 backdrop-blur-xl relative overflow-hidden shadow-xl ${section.border} hover:-translate-y-1`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
                      <Icon className={`w-7 h-7 ${section.color}`} />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[12px] font-mono font-semibold tracking-wider uppercase bg-white/5 text-zinc-400 border border-white/10">
                      {section.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors flex items-center gap-2">
                    {section.title}
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-primary" />
                  </h3>

                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                    {section.desc}
                  </p>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    <span>View Section Chart</span>
                    <span className="text-primary font-bold">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Graph;