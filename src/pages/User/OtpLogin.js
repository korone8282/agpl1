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
    <div className='min-h-screen bg-background p-6 flex justify-center items-center'>
   
{showOtp?( 
<div className='flex flex-col gap-12'>
<div>
Enter OTP sent to 
</div>
        <div className='flex gap-4'>
        {
            formData.otp.map((key,index)=>(
                <Input type='text'
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
        className='text-2xl font-semibold h-16 w-[14rem] flex items-center justify-center text-[#f59e0b] rounded-lg bg-black border-2 hover:scale-105 border-[#f59e0b] text-center cursor-auto hover:bg-[#f59e0b] hover:text-black'>
            Edit Details?
        </div>
</div> ) : (
        <div className='w-5/6'>
         <div className='mb-8 text-center text-3xl my-20'>Enter Email</div>
        <div className='flex flex-col justify-center items-center text-3xl gap-8'>
           <input type='text'
           id='field'
           name="email"
           autoComplete='on'
           className='h-12 border-4 p-4 border-black md:w-fit w-80 rounded-sm bg-transparent'
           placeholder='Enter Details'
           onChange={(e)=>setformData({...formData, email: e.target.value})}
           />

          <button onClick={submitHandle}
          className='text-2xl font-semibold h-16 w-[9.6rem] text-[#f59e0b] rounded-lg border-2 hover:scale-105 border-[#f59e0b] text-center cursor-auto hover:bg-[#f59e0b] hover:text-black'>
            Get OTP
          </button>
    </div>

        </div>
          )}
</div>
  )
}
export default OtpLogin