import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import ProfileMenu from './ProfileMenu';
import { Settings, Home, SquareSigma, Bot } from "lucide-react";
import { format } from "date-fns";
import { useNavigate, Link } from 'react-router-dom';
import { Calculator } from './Calculator';
import { AiAssistant } from './AiAssistant';
import { BASE_URL } from '../redux/Utils/constants';
import { apiConnector } from '../redux/Utils/apiConnector';

const Header = () => {

  const [showCalculator, setShowCalculator] = useState(0);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [profileOpen, setProfileOpen] = useState(0);
  const [backendActive, setBackendActive] = useState(null);
  const [isPinging, setIsPinging] = useState(false);
  const profileMenuRef = useRef(null);

  const navigate = useNavigate();

  const {userinfo} = useSelector(state=>state.auth);

  const checkBackendHealth = async () => {
    try {
      setIsPinging(true);
      const res = await apiConnector(`${BASE_URL}/api/health`, 'GET');
      if (res.status === 200 || res.data?.success) {
        setBackendActive(true);
      } else {
        setBackendActive(false);
      }
    } catch (err) {
      try {
        const rootRes = await apiConnector(`${BASE_URL}/`, 'GET');
        if (rootRes.status === 200 || rootRes.data?.success) {
          setBackendActive(true);
          return;
        }
      } catch (e) {
        // Fallback also failed
      }
      setBackendActive(false);
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(0);
      }
    };

    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [profileOpen]);

  return ( 
 
        <header className="w-full px-4 sm:px-8 py-3.5 bg-black/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between max-w-full">
            <div className="flex items-center space-x-4 cursor-pointer group" onClick={() => navigate("/")}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-lg shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                AG
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-white font-bold tracking-wide text-base sm:text-lg group-hover:text-primary transition-colors">
                    Aliments Global Private Limited
                  </h1>
                  <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[12px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    ERP
                  </span>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    checkBackendHealth();
                  }}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono cursor-pointer hover:text-zinc-200 transition-colors group/status w-fit"
                  title={
                    backendActive === true
                      ? "Backend Online & Active (Click to ping)"
                      : backendActive === false
                      ? "Backend Idle / Sleeping (Click to ping/wake up)"
                      : "Checking backend status..."
                  }
                >
                  <span
                    className={`w-2 h-2 rounded-full transition-all ${
                      backendActive === true
                        ? "bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse"
                        : backendActive === false
                        ? "bg-rose-500 shadow-sm shadow-rose-500/50 animate-ping"
                        : "bg-amber-400 animate-pulse"
                    }`}
                  ></span>
                  <span>{format(new Date(), "MMMM d, yyyy")}</span>
                  {backendActive === false && (
                    <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.5 rounded font-sans font-semibold group-hover/status:bg-rose-500/20">
                      {isPinging ? "Waking..." : "Idle (Click to wake)"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <nav>
              <div>
                {userinfo ? (
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-zinc-200 font-medium text-sm">
                      <div className="w-6 h-6 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center uppercase">
                        {userinfo?.fname?.charAt(0) || "U"}
                      </div>
                      <span>{userinfo?.fname}</span>
                    </div>

                    <button
                      title="AI Factory Copilot"
                      className={`p-2.5 rounded-xl border transition-all relative group ${
                        showAiAssistant
                          ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                          : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-primary/40"
                      }`}
                      onClick={() => {
                        setShowAiAssistant(!showAiAssistant);
                        setShowCalculator(0);
                        setProfileOpen(0);
                      }}
                    >
                      <Bot className={`w-5 h-5 ${showAiAssistant ? "text-black" : "text-primary group-hover:scale-110 transition-transform"}`} />
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                      </span>
                    </button>

                    <button
                      title="Calculator"
                      className={`p-2.5 rounded-xl border transition-all ${
                        showCalculator
                          ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                          : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20"
                      }`}
                      onClick={() => {
                        setShowCalculator(!showCalculator);
                        setShowAiAssistant(false);
                        setProfileOpen(0);
                      }}
                    >
                      <SquareSigma className="w-5 h-5" />
                    </button>

                    <button
                      title="Home Dashboard"
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                      onClick={() => navigate("/")}
                    >
                      <Home className="w-5 h-5" />
                    </button>

                    <div ref={profileMenuRef} className="relative">
                      <button
                        title="User Settings"
                        className={`p-2.5 rounded-xl border transition-all ${
                          profileOpen
                            ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                            : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20"
                        }`}
                        onClick={() => {
                          setProfileOpen(!profileOpen);
                        }}
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                      {profileOpen ? <ProfileMenu onClose={() => setProfileOpen(0)} /> : null}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 items-center">
                    <Link
                      to="/Login"
                      className="px-5 py-2 text-sm font-semibold text-primary border border-primary/50 rounded-xl hover:bg-primary hover:text-black transition-all shadow-sm"
                    >
                      Login
                    </Link>
                    <Link
                      to="/SignUp"
                      className="px-5 py-2 text-sm font-semibold text-black bg-primary rounded-xl hover:bg-amber-400 transition-all shadow-lg shadow-primary/20"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {showCalculator ? <Calculator /> : null}
          <AiAssistant isOpen={showAiAssistant} onClose={() => setShowAiAssistant(false)} />
        </header>
      );
    };

export default Header
