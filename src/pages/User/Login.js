import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link, redirect, useNavigate} from 'react-router-dom'
import { useEffect,useState} from "react";
import { useForm } from "react-hook-form";
import {toast} from 'react-toastify';
import { setcredentials } from '../../redux/Slices/authSlice';
import { apiConnector } from '../../redux/Utils/apiConnector';
import {LOGIN_API, GOOGLE_API} from '../../redux/Utils/constants';
import {AiOutlineEyeInvisible,AiOutlineEye} from 'react-icons/ai'
import { GoogleLogin } from '@react-oauth/google';
import { Input } from "../../components/Input";
import PageTransition from '../PageTransition';

const Login = () => {

    const {userinfo} = useSelector(state=>state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(0);
    const { register, 
            handleSubmit,
            reset, 
            formState: {errors,isSubmitSuccessful} 
          }  = useForm();
          
          useEffect(() => {
            if(isSubmitSuccessful){
              reset({
                email:"",
                password:""
              })
            }
            if(userinfo){
              navigate("/");
            }
          }, [isSubmitSuccessful,userinfo,navigate,reset]);

  
    const loginHandler = async(data,e) =>{
      e.preventDefault();
      const toastId = toast.loading("Loading...",{
        position: 'top-center',
      });
      try {
        const res = await apiConnector(LOGIN_API,"POST",data),
              userinform = res.data.existUser;

        dispatch(setcredentials(userinform));

        toast.dismiss(toastId);
        toast("Logged In");

        navigate("/")
      } catch (error) {
        toast.dismiss(toastId);
        toast.error(error.message);
      }
    }

    const googleLogin = async(token) =>{
      const toastId = toast.loading("Loading...",{
        position: 'top-center',
      });
      
      try {
        const res = await apiConnector(GOOGLE_API,"POST",{token}),
              userinform = res.data?.existUser || res.data?.user || res.data;

        if (!userinform) {
          throw new Error("User data not found in backend response");
        }
        
        dispatch(setcredentials(userinform));

        toast.dismiss(toastId);
        toast("logged in");
      } catch (error) {
        toast.dismiss(toastId);
        toast.error(error.message);
      }
    }

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 sm:p-6 relative">
        <div className="w-full max-w-md bg-[#0d0d0d]/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-xl shadow-lg shadow-amber-500/20 mx-auto mb-3">
              AG
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Aliments Global</h1>
            <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-mono">Operations Portal Sign In</p>
          </div>

          <form onSubmit={handleSubmit((data, e) => loginHandler(data, e))} className="space-y-4" autoComplete="on">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Email
              </label>
              <Input
                type="email"
                id="email"
                placeholder="name@alimentsglobal.com"
                {...register("email", { required: true })}
                className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                autoComplete="on"
              />
              {errors.email && (
                <span className="text-rose-400 text-xs mt-1 block">Enter email</span>
              )}
            </div>

            <div>
              <label htmlFor="pass" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="pass"
                  placeholder="••••••••"
                  {...register("password", { required: true })}
                  className="w-full px-4 py-2.5 pr-11 rounded-xl bg-black border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                />
                <span
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 hover:text-white"
                >
                  {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                </span>
              </div>
              {errors.password && (
                <span className="text-rose-400 text-xs mt-1 block">Enter password</span>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-primary hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-primary/20 cursor-pointer text-sm mt-2"
            >
              Submit
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-[13px] font-mono text-zinc-500 uppercase">Or</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate("/otpLogin")}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-semibold rounded-xl transition-all text-sm flex items-center justify-center cursor-pointer"
            >
              Login with OTP
            </button>

            <div className="flex justify-center pt-1">
              <GoogleLogin
                onSuccess={(credentialResponse) => { googleLogin(credentialResponse.credential) }}
                onError={() => { console.log('Login Failed') }}
                useOneTap
              />
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-400">
            Haven't Registered Yet?{" "}
            <Link
              to={redirect ? `/SignUp` : `/SignUp?redirect=${redirect}`}
              className="text-primary hover:underline font-semibold"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  )
}

export default Login