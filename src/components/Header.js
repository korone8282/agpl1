import React, {useState} from 'react'
import { useSelector } from 'react-redux';
import ProfileMenu from './ProfileMenu';
import { Settings, Home, SquareSigma } from "lucide-react";
import { format } from "date-fns";
import { useNavigate, Link } from 'react-router-dom';
import { Calculator } from './Calculator';

const Header = () => {

  const [showCalculator, setShowCalculator] = useState(0);
  const [profileOpen, setProfileOpen] = useState(0);

  const navigate = useNavigate();

  const {userinfo} = useSelector(state=>state.auth);

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
                <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {format(new Date(), "MMMM d, yyyy")}
                </span>
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
                      title="Calculator"
                      className={`p-2.5 rounded-xl border transition-all ${
                        showCalculator
                          ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                          : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20"
                      }`}
                      onClick={() => {
                        setShowCalculator(!showCalculator);
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

                    <button
                      title="User Settings"
                      className={`p-2.5 rounded-xl border transition-all ${
                        profileOpen
                          ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                          : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20"
                      }`}
                      onClick={() => {
                        if (!profileOpen) {
                          navigate(`/admin/Profile/${userinfo._id}`);
                        }
                        setProfileOpen(!profileOpen);
                      }}
                    >
                      <Settings className="w-5 h-5" />
                    </button>
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
          {profileOpen ? <ProfileMenu /> : null}
        </header>
      );
    };

export default Header
