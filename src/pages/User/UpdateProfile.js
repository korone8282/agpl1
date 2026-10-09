import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useNavigate, useParams } from 'react-router-dom';
import { PROFILE_URL, UPLOAD_URL } from '../../redux/Utils/constants';
import { Input } from "../../components/Input";
import { User, ArrowLeft, Check, Camera } from "lucide-react";
import PageTransition from '../PageTransition';

const UpdateProfile = () => {
  const { userinfo } = useSelector((state) => state.auth);
  const { id } = useParams();
  const [imageUrl, setimageUrl] = useState("");
  const navigate = useNavigate();

  const [data, setData] = useState({
    fname: "",
    dob: "",
    gender: "",
    image: "",
    about: "",
  });

  const uploadFileHandler = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = new FormData();
    file.append('image', e.target.files[0]);

    try {
      const res = await apiConnector(UPLOAD_URL, "POST", file);
      toast("Image successfully uploaded");
      const cleanUrl = res.data.image.substring(9);
      setData((prev) => ({ ...prev, image: cleanUrl }));
      setimageUrl(cleanUrl);
    } catch (error) {
      toast.error("Failed to upload image");
    }
  };

  async function handleSubmit() {
    const file = new FormData();
    file.append('fname', data.fname);
    file.append('dob', data.dob);
    file.append('gender', data.gender);
    file.append('image', data.image);
    file.append('about', data.about);

    const toastId = toast.loading("Saving changes...", {
      position: 'top-center',
    });

    try {
      await apiConnector(`${PROFILE_URL}/${id}`, "PUT", file, {
        Authorization: `Bearer ${userinfo.token}`,
      });

      toast.dismiss(toastId);
      toast("Profile successfully updated");
      navigate("/");
    } catch (e) {
      toast.dismiss(toastId);
      console.log(e);
      toast.error("Failed to update profile");
    }
  }

  const inputHandler = async (e) => {
    setData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d0d0d]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 text-start">
          {/* Header */}
          <div className="border-b border-white/10 pb-4 flex items-center justify-between">
            <div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <User className="w-6 h-6 text-primary" />
                Update Profile
              </h1>
            </div>
            <span className="text-xs font-mono text-zinc-500">ID: {id?.slice(-6)}</span>
          </div>

          {/* Avatar Upload */}
          <div className="flex items-center gap-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="relative">
              <img
                src={imageUrl || "https://api.dicebear.com/7.x/initials/svg?seed=" + (data.fname || "User")}
                alt="Profile Preview"
                className="w-20 h-20 rounded-2xl object-cover border border-white/20 shadow-md bg-zinc-900"
              />
              <label className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-primary text-black cursor-pointer hover:bg-amber-400 shadow-md">
                <Camera className="w-3.5 h-3.5" />
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={uploadFileHandler}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Profile Photo</p>
              <p className="text-[13px] text-zinc-400 mt-0.5">Click camera icon to upload a square JPEG or PNG.</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1.5 uppercase">Full Name</label>
              <Input
                type="text"
                name="fname"
                placeholder="Enter your name"
                onChange={inputHandler}
                value={data.fname}
                className="w-full px-3.5 py-2.5 bg-black border border-white/15 rounded-xl text-white text-xs focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1.5 uppercase">Gender</label>
              <select
                name="gender"
                onChange={inputHandler}
                value={data.gender}
                className="w-full px-3.5 py-2.5 bg-black border border-white/15 rounded-xl text-white text-xs focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1.5 uppercase">About / Bio</label>
              <textarea
                name="about"
                rows={3}
                placeholder="Write a brief bio about yourself..."
                onChange={inputHandler}
                value={data.about}
                className="w-full px-3.5 py-2.5 bg-black border border-white/15 rounded-xl text-white text-xs focus:border-primary focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1.5 uppercase">Date of Birth</label>
              <Input
                type="date"
                name="dob"
                onChange={inputHandler}
                value={data.dob}
                className="w-full px-3.5 py-2.5 bg-black border border-white/15 rounded-xl text-white text-xs focus:border-primary focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-medium cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-primary/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save Profile
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default UpdateProfile;
