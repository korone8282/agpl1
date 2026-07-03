import React, { useState}  from 'react'
import { useSelector } from 'react-redux'; 
import { toast } from 'react-toastify'
import { apiConnector } from '../../redux/Utils/apiConnector'
import {  useNavigate, useParams } from 'react-router-dom'
import { PROFILE_URL,UPLOAD_URL} from '../../redux/Utils/constants';
import { Input } from "../../components/Input";

const UpdateProfile = () => {

  const {userinfo} = useSelector(state => state.auth);

  const {id} = useParams();

  const [imageUrl, setimageUrl] = useState("");

  const navigate = useNavigate();

  const [data, setData] = useState({
    fname:"",
    dob:"",
    gender:"",
    image:"",
    about:"",
});

const uploadFileHandler = async(e) =>{
  
  const file = new FormData();
  file.append('image',e.target.files[0]);

  try {

      const res = await apiConnector(UPLOAD_URL,"POST",file);
      toast("image successfully uploaded");
      data.image=res.data.image.substring(9);
      setimageUrl(res.data.image.substring(9));

  } catch (error) {
      toast.error(error);
  }

}

async function handleSubmit(){

  const file = new FormData();

  file.append('fname',data.fname);
  file.append('dob',data.dob);
  file.append('gender',data.gender);
  file.append('image',data.image);
  file.append('about',data.about);

  const toastId = toast.loading("Loading...",{
    position: 'top-center',
  });

  try{
    await apiConnector(`${PROFILE_URL}/${id}`,"PUT",file,{Authorization: `Bearer ${userinfo.token}`});
    
    toast.dismiss(toastId);
    toast("User successfully updated");
    navigate("/");

  } catch (e) {
    toast.dismiss(toastId);
    console.log(e);
  }
      }

  const inputHandler = async(e) =>{
    setData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value
    }));
  }

  return (
    <div className='min-h-screen mx-auto bg-background p-6 w-fit my-16'>

    <div className='bg-[#22252a] text-white  p-6 rounded-lg shadow-lg w-full max-w-md z-30 h-fit inset-0 m-auto'>
    <div className=' flex flex-col gap-10'>

   <div className='flex w-full justify-between text-2xl font-bold gap-12 items-center'>
              <img
                src={imageUrl ? imageUrl : "image here"}
                alt="Profile"
                className="rounded-full h-20 w-20 object-cover border-black border-2"
              />
            <label className="max-w-96 px-4 block w-full text-center rounded-lg cursor-pointer py-11">
              <Input
                type="file"
                name="image"
                accept="image/*"
                onChange={e=>{
                    uploadFileHandler(e);
                }}
              />
            </label>
    </div>

    <div className='flex w-full justify-between gap-10'>
    <label>Name: </label>
        <Input  type='text'
                name='fname'
                onChange={(e)=>inputHandler(e)}
                />
    </div>

    <div className='flex w-full justify-between gap-10'>
    <label>Gender: </label>
        <select type='text'
                className='w-full p-2 bg-[#2e3138] border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
                name='gender'
                onChange={(e)=>inputHandler(e)}
                >
                <option className=' bg-[#2e3138] text-muted-foreground' value={"Male"}>Select</option>
                <option className=' bg-[#2e3138] text-muted-foreground' value={"Male"}>Male  </option>
                <option className=' bg-[#2e3138] text-muted-foreground' value={"Female"}>Female  </option>
                <option className=' bg-[#2e3138] text-muted-foreground' value={"Others"}>Others  </option>
        </select> 
    </div>

    <div className='flex w-full justify-between gap-10'>
    <label>About: </label>
        <Input  type='text'
                name='about'
                onChange={(e)=>inputHandler(e)}
                />
    </div>

    <div className='flex w-full justify-between gap-10'>
    <label>DOB: </label>
        <Input  type='date'
                name='dob'
                onChange={(e)=>inputHandler(e)}
                />
    </div>

        <button  onClick={handleSubmit}
                className=' hover:scale-95 border-[#f59e0b] border-2 text-primary w-fit h-fit p-4 rounded-md mx-auto text-xl'>Update Profile</button>
      </div>
    </div>

    </div>
  )
}

export default UpdateProfile
