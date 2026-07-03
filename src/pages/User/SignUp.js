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
     <div className='min-h-screen bg-background p-6'>
      { !showOtp? (
        <div>
      <div className='h-[90vh] flex items-center justify-center'>
        <img src='https://images.unsplash.com/photo-1576502200916-3808e07386a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2065&q=80'
        alt=''
        className='md:h-[40rem] md:w-[35rem] h-0 w-0' />
        <section className='flex flex-col h-[40rem] md:w-[35rem] w-[20rem] mx-1'>
        <p className='ml-6 mt-16 text-5xl font-semibold'>Register Now..</p>
        <div className='flex flex-col ml-6 mt-8'>
  
        <label htmlFor="name" className='mb-2 text-xl'>
              Name
        </label>
        <Input type='name' 
               id="fname" 
               name="fname"
               onChange={(e)=>setformData({...formData, fname: e.target.value})}
                className='h-8 border-2 border-gray-300 rounded-sm'
               />
  
        <label htmlFor="email" className='mb-2 text-xl'>
              Email
        </label>
        <Input type='email' 
               id="email" 
               name="email" 
               onChange={(e)=>setformData({...formData, email: e.target.value})}
                className='h-8 border-2 border-gray-300 rounded-sm'
               />
  
          <label htmlFor="pass" className='relative mb-2 text-xl mt-2 '>
              Password
              <span
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-[41px] z-[10] cursor-pointer bg-transparent"
          >
            {showPassword ? (
              <AiOutlineEyeInvisible fontSize={24} fill="#AFB2BF" />
            ) : (
              <AiOutlineEye fontSize={24} fill="#AFB2BF" />
            )}
          </span>
          </label>
          <Input type={showPassword ? "text" : "password"}
                 id="pass" 
                 name='password'
                 onChange={(e)=>setformData({...formData, password: e.target.value})}
                 className='h-8 border-2 border-gray-300 rounded-sm'
                       />
  
          <label htmlFor="confirPassword" className='relative mb-2 text-xl mt-2'>
             Confirm Password
             <span
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-[41px] z-[10] cursor-pointer bg-transparent"
          >
            {showPassword ? (
              <AiOutlineEyeInvisible fontSize={24} fill="#AFB2BF" />
            ) : (
              <AiOutlineEye fontSize={24} fill="#AFB2BF" />
            )}
          </span>
          </label>
          <Input type={showPassword ? "text" : "password"}
                 id="confirmPassword" 
                 name = "confirmPassword" 
                 onChange={(e)=>setformData({...formData, confirmPassword: e.target.value})}
                 className='h-8 border-2 border-gray-300 rounded-sm'
                       />
  
           <button onClick={submitHandle}
                   className='text-xl mt-6 font-semibold h-16 w-[9.6rem] text-center border-[#f59e0b] border-2 hover:bg-primary hover:text-black rounded-xl'
                   >
            Submit
          </button>
        </div>

        <div className='flex justify-between mx-5 text-xl mt-6 gap-2'>

          <h2 className='hidden md:block'>Google</h2>
             <GoogleLogin
                 onSuccess={credentialResponse => { googleLogin(credentialResponse.credential) }}
                 onError={() => {console.log('Login Failed')}}
                 useOneTap
             />
       </div>
     
           <p className='ml-6 mt-4 text-lg  sm:max-lg:text-md'>
            Already a User? {" "}
            <Link to={redirect? `/Login`:`/login?redirect=${redirect}`}
            className='text-red-500 hover:text-red-800'>
             Login
            </Link>
           </p>
     
        </section>
      </div>
    </div>
      ):(
        <div className='min-h-screen bg-background p-6 flex justify-center items-center flex-col gap-12 mx-3'>
<div>
Enter OTP sent to 
</div>
        <div className='flex gap-4'>
        {
            formData.otp.map((key,index)=>(
                <input type='text'
                       name='otp'
                       ref={input=>(inputRef.current[index]=input)}
                       key={index}
                       maxLength='1'
                       className='h-12 w-12 text-center bg-transparent'
                       placeholder='-'
                       onChange={(e)=>indexHandler(index,e)}
                       onClick={()=>keyHandler(index)} 
                       onKeyDown={(e)=>editHandle(e,index)}
                       />
            ))
        
        } 
        </div>
        <div onClick={()=>setshowOtp(0)}
        className='text-2xl font-semibold h-16 w-[14rem] flex items-center justify-center text-[#f59e0b] rounded-lg border-2 hover:scale-105 border-[#f59e0b] text-center cursor-auto hover:bg-[#f59e0b] hover:text-black'>
            Edit Details?
        </div>
  </div>
      )}
     </div>
      </PageTransition>

    )
  }
  
  export default SignUp