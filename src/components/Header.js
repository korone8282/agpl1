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
 
        <header className="w-full px-6 py-4 bg-black backdrop-blur-md border-b border-gray-800 relative z-50">
          <div className="mx-4 flex flex-col lg:flex-row gap-6 items-center justify-between">
            <div className="flex items-center space-x-4 text-xl">
              <h1 className="text-primary font-medium hover:cursor-pointer"
                  onClick={()=>navigate("/")}>Artha Cuisine Private Limited</h1>
              <span className="text-sm text-muted-foreground">
                {format(new Date(), "MMMM d, yyyy")}
              </span>
            </div>
            <nav>
     
              <div>
          {
            userinfo ? (
              <div className="flex items-center space-x-8">
              <div className="p-2 hover:bg-secondary/80 rounded-full transition-colors text-white font-semibold">
                {userinfo?.fname}
              </div>
              
              <button className="p-2 hover:bg-secondary/80 rounded-full transition-colors"
                    onClick={()=>{
                                  setShowCalculator(!showCalculator)
                                  setProfileOpen(0)}}>
                <SquareSigma className="w-7 h-7 text-primary"/>
              </button>
              <button className="p-2 hover:bg-secondary/80 rounded-full transition-colors"
                     onClick={()=>navigate("/")}>
                <Home className="w-7 h-7 text-primary" />
              </button>
              <button className="p-2 hover:bg-secondary/80 rounded-full transition-colors"
                      onClick={()=>{
                                    if(!profileOpen){
                                      navigate(`/admin/Profile/${userinfo._id}`)
                                    }
                                    setProfileOpen(!profileOpen)
                                      }}>
                <Settings className="w-7 h-7 text-primary" />
              </button>
              </div>
            
            ) : (
              <div className='flex gap-6 items-center'>
              <Link to="/Login" className='hover:translate-y-1 h-10 w-24 flex items-center justify-center text-[#f59e0b] rounded-lg bg-black border-2 hover:scale-105 border-[#f59e0b] text-center cursor-auto hover:bg-[#f59e0b] hover:text-black'>
                Login
            </Link>
            <Link to="/SignUp" className='hover:translate-y-1 h-10 w-24 flex items-center justify-center  text-[#f59e0b] rounded-lg bg-black border-2 hover:scale-105 border-[#f59e0b] text-center cursor-auto hover:bg-[#f59e0b] hover:text-black'>
                SignUp
            </Link>
              </div>
            )
          }
        </div>
            </nav>
          </div>

        {showCalculator ? <Calculator/> : null}

        {profileOpen ? <ProfileMenu/> : null}
        </header>
      );
    };

export default Header
