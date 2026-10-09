import React from 'react'
import { useEffect,useState,useRef } from "react";
import { apiConnector } from '../../redux/Utils/apiConnector';
import { toast } from 'react-toastify';
import { GENOTP_URL,OTPLOG_URL } from '../../redux/Utils/constants';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setcredentials } from '../../redux/Slices/authSlice';
import { Input } from "../../components/Input";

const OtpLogin = () => {

    const [showOtp, setshowOtp] = useState(0);
    const [formData, setformData] = useState({
      email:"",
      otp: new Array(4).fill(""),
    });

    const inputRef = useRef([]);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        inputRef.current[0]?.focus();
    }, [showOtp]);

    function  indexHandler(index,e){

        formData.otp[index]=e.target.value;
        
        const finalOtp = formData.otp.join("");

        if(finalOtp.length===4){
         loginHandler();
          return;
        }
        
        if(index<3 && formData.otp[index]!==""){
          inputRef.current[index+1].focus();
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
          
          await apiConnector(GENOTP_URL,"POST",formData);

          toast.dismiss(toastId);
          toast("Otp sent to email");

          setshowOtp(1);
        } catch (error) {
          console.log("error sending otp",error);
        }
    }

    const loginHandler = async() =>{
      const toastId = toast.loading("Loading...",{
        position: 'top-center',
      });
      try {
        const res = await apiConnector(OTPLOG_URL,"POST",formData),
              userinfo = res.data.existUser;
        
        dispatch(setcredentials(userinfo));

        toast.dismiss(toastId);
        toast("logged in");

        navigate("/");
      } catch (error) {
        toast.dismiss(toastId);
        toast.error(error.message);
      }
    }

    function editHandle(e,index){
      if(e.key==="Backspace" && formData.otp[index]==="" && index>0){
        inputRef.current[index-1].focus();
      }
    }

  return (
    <div className="min-h-screen bg-black text-white flex justify-center items-center p-4 sm:p-6 relative">
      <div className="w-full max-w-md bg-[#0d0d0d]/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {showOtp ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 font-mono font-bold text-xl">
              OTP
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Verify Your OTP</h2>
            <p className="text-xs text-zinc-400 mb-6 font-mono">
              Enter the 4-digit verification code sent to <span className="text-primary">{formData.email}</span>
            </p>

            <div className="flex justify-center gap-3 mb-6">
              {formData.otp.map((key, index) => (
                <Input
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
              ← Change Email Address
            </button>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-xl shadow-lg shadow-amber-500/20 mx-auto mb-3">
                AG
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">One-Time Password</h1>
              <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-mono">Passwordless Verification</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="field" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  id="field"
                  name="email"
                  autoComplete="on"
                  className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                  placeholder="Enter your registered email"
                  onChange={(e) => setformData({ ...formData, email: e.target.value })}
                />
              </div>

              <button
                type="button"
                onClick={submitHandle}
                className="w-full py-3 bg-primary hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-primary/20 cursor-pointer text-sm"
              >
                Get Verification OTP
              </button>

              <button
                type="button"
                onClick={() => navigate("/Login")}
                className="w-full py-2.5 text-zinc-400 hover:text-white text-xs font-medium transition-colors"
              >
                ← Back to Password Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default OtpLogin