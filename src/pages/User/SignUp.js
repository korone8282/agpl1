import React, { useEffect,useState,useRef} from 'react'
import { Link, useNavigate ,redirect} from 'react-router-dom';
import {toast} from 'react-toastify';
import { VERIFY_URL, GOOGLE_API, REGISTER_API } from '../../redux/Utils/constants';
import {AiOutlineEyeInvisible,AiOutlineEye} from 'react-icons/ai'
import { apiConnector } from '../../redux/Utils/apiConnector';
import { GoogleLogin } from '@react-oauth/google';
import { Input } from "../../components/Input";
import PageTransition from '../PageTransition';

const SignUp = () => {
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(0);
    const [showOtp, setshowOtp] = useState(0);
  
    const [formData, setformData] = useState({
      fname: "",
      email:"",
      password:"",
      confirmPassword:"",
      otp: new Array(4).fill(""),
    });
  
    const inputRef = useRef([]);
  
    useEffect(() => {
        inputRef.current[0]?.focus();
    }, [showOtp]);
  
    function  indexHandler(index,e){
  
        formData.otp[index]=e.target.value;
        
        const finalOtp = formData.otp.join("");
  
        if(finalOtp.length===4){
         registerHandler();
          return;
        }
        
        if(index<3 && formData.otp[index]!==""){
          inputRef.current[index+1].focus();
        }
      }
    
      const googleLogin = async(token) =>{
        try {
         await apiConnector(GOOGLE_API,"POST",{token})
         toast.success("successfully signed up");
          navigate("/login")
        } catch (error) {
          toast.error(error.message);
        }
      }

    function keyHandler(index){
        inputRef.current[index].focus();
    }
  
    const submitHandle = async() =>{
        try {
          const toastId = toast.loading("Loading...",{
            position: 'top-center',
          });

          await apiConnector(VERIFY_URL,"POST",formData);

          toast.dismiss(toastId);
          toast("Otp sent to email");
          
          setshowOtp(1);
        } catch (error) {
          console.log("error sending otp",error);
        }
    }
  
    function editHandle(e,index){
      if(e.key==="Backspace" && formData.otp[index]==="" && index>0){
        inputRef.current[index-1].focus();
      }
    }
    
  const registerHandler = async() =>{
    const toastId = toast.loading("Loading...",{
      position: 'top-center',
    });
  try {
  await apiConnector(REGISTER_API,"POST",formData);

  toast.dismiss(toastId);
  toast.success("successfully signed up");

  navigate("/Login");
  } catch (error) {
  toast.dismiss(toastId);
  toast.error(error.message);
  }
  }
  
    return (
      <PageTransition>
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 sm:p-6 relative">
          {!showOtp ? (
            <div className="w-full max-w-md bg-[#0d0d0d]/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-xl shadow-lg shadow-amber-500/20 mx-auto mb-3">
                  AG
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Create Account</h1>
                <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-mono">Aliments Global ERP Portal</p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label htmlFor="fname" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    id="fname"
                    name="fname"
                    placeholder="Enter full name"
                    onChange={(e) => setformData({ ...formData, fname: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="name@alimentsglobal.com"
                    onChange={(e) => setformData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="pass" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      id="pass"
                      name="password"
                      placeholder="••••••••"
                      onChange={(e) => setformData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2.5 pr-11 rounded-xl bg-black border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    />
                    <span
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 hover:text-white"
                    >
                      {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder="••••••••"
                      onChange={(e) => setformData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2.5 pr-11 rounded-xl bg-black border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    />
                    <span
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 hover:text-white"
                    >
                      {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={submitHandle}
                  className="w-full py-3 bg-primary hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-primary/20 cursor-pointer text-sm mt-2"
                >
                  Create Account
                </button>
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-[13px] font-mono text-zinc-500 uppercase">Or Continue With</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              <div className="flex justify-center pt-1">
                <GoogleLogin
                  onSuccess={(credentialResponse) => { googleLogin(credentialResponse.credential); }}
                  onError={() => { console.log('Login Failed'); }}
                  useOneTap
                  theme="filled_black"
                  shape="pill"
                />
              </div>

              <p className="mt-5 text-center text-xs text-zinc-400">
                Already registered?{" "}
                <Link
                  to={redirect ? `/Login` : `/login?redirect=${redirect}`}
                  className="text-primary hover:underline font-semibold"
                >
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            <div className="w-full max-w-md bg-[#0d0d0d]/90 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 font-mono font-bold text-xl">
                OTP
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Verify Your Email</h2>
              <p className="text-xs text-zinc-400 mb-6 font-mono">
                Enter the 4-digit code sent to <span className="text-primary">{formData.email}</span>
              </p>

              <div className="flex justify-center gap-3 mb-6">
                {formData.otp.map((key, index) => (
                  <input
                    type="text"
                    name="otp"
                    ref={(input) => (inputRef.current[index] = input)}
                    key={index}
                    maxLength="1"
                    className="h-14 w-14 text-center text-xl font-mono font-bold bg-black border-2 border-white/20 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-white outline-none transition-all"
                    placeholder="-"
                    onChange={(e) => indexHandler(index, e)}
                    onClick={() => keyHandler(index)}
                    onKeyDown={(e) => editHandle(e, index)}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setshowOtp(0)}
                className="px-6 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all"
              >
                ← Edit Registration Details
              </button>
            </div>
          )}
        </div>
      </PageTransition>
    );
  };
  
  export default SignUp