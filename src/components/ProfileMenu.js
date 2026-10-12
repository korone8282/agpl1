import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from '../redux/Slices/authSlice';
import { toast } from 'react-toastify';
import { googleLogout } from '@react-oauth/google';
import { motion } from "framer-motion";
import { apiConnector } from '../redux/Utils/apiConnector';
import { LOGOUT_API } from '../redux/Utils/constants';
import './ProfileMenu.css';

const ProfileMenu = ({ onClose }) => {
  const { userinfo } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleItemClick = (callback) => {
    if (onClose) onClose();
    if (callback) callback();
  };

  const logouthandler = async () => {
    const toastId = toast.loading("Loading...", {
      position: 'top-center',
    });

    try {
      await apiConnector(LOGOUT_API, "POST");
      toast.dismiss(toastId);
      toast.success("logged out successfully");
      navigate("/Login");
      dispatch(logout());
      googleLogout();
      window.location.reload();
    } catch (error) {
      toast.dismiss(toastId);
      console.log(error);
    }
  };

  const userId = userinfo?._id || userinfo?.id || '';

  const menuItems = [
    {
      id: "profile",
      label: "Profile",
      action: () => navigate(`/admin/Profile/${userId}`),
      danger: false,
    },
    {
      id: "buyers-info",
      label: "Buyers Info",
      action: () => navigate("/admin/BuyerList"),
      danger: false,
    },
    {
      id: "product",
      label: "Product",
      action: () => navigate("/admin/ProductList"),
      danger: false,
    },
    {
      id: "manage-users",
      label: "Manage Users",
      action: () => navigate("/admin/Userlist"),
      danger: false,
    },
    {
      id: "logout",
      label: "Logout",
      action: logouthandler,
      danger: true,
    },
  ];

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-[164px] shadow-2xl border border-white/10 rounded-xl overflow-hidden bg-black">
      {userinfo ? (
        <motion.div
          className="radio-container bg-black rounded-xl p-0 relative"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`menu-item-btn w-full text-left h-[46px] px-3.5 mb-2 rounded-lg text-xs font-semibold flex items-center transition-all ${
                item.danger
                  ? 'text-rose-400 hover:text-rose-300'
                  : index === activeIndex
                  ? 'text-primary font-bold'
                  : 'text-zinc-300 hover:text-white'
              } ${item.danger ? 'danger-item' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => handleItemClick(item.action)}
            >
              {item.label}
            </button>
          ))}

          <div className="glider-container">
            <div
              className="glider"
              style={{
                transform: `translateY(${activeIndex * 54}px)`,
              }}
            />
          </div>
        </motion.div>
      ) : null}
    </div>
  );
};

export default ProfileMenu;