import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from '../redux/Slices/authSlice';
import { toast } from 'react-toastify';
import { googleLogout } from '@react-oauth/google';
import { motion } from "framer-motion";
import { apiConnector } from '../redux/Utils/apiConnector';
import { LOGOUT_API } from '../redux/Utils/constants';
import './ProfileMenu.css';

const ProfileMenu = () => {

  const {userinfo} = useSelector(state => state.auth);

  const navigate = useNavigate();

  const dispatch = useDispatch();

  const logouthandler = async() =>{

    const toastId = toast.loading("Loading...",{
      position: 'top-center',
    });

    try {
      await apiConnector(LOGOUT_API,"POST");
      toast.dismiss(toastId);
      toast.success("logged out successfully");
      navigate("/Login")
      dispatch(logout());
      googleLogout();
      window.location.reload();
    } catch (error) {
      toast.dismiss(toastId);
      console.log(error);
    }
}

  return (
<div className="absolute right-[0.2%] top-[100%] z-40">
        {
            userinfo ? (
              <motion.div className="radio-container bg-black rounded-b-xl" initial={{ y: 20}} animate={{ y: 0 }}>
                    <input type="radio" id="profile" name="menu" />
                    <label htmlFor="profile" className="py-2 px-3 block mb-5 rounded-sm" onClick={() => navigate(`/admin/Profile/${userinfo._id}`)}>
                      Profile
                    </label>
                    <input type="radio" id="buyers-info" name="menu" />
                    <label htmlFor="buyers-info" className="py-2 px-3 block mb-5 rounded-sm" onClick={() => navigate("/admin/BuyerList")}>
                      Buyers Info
                    </label>
                    <input type="radio" id="product" name="menu" />
                    <label htmlFor="product" className="py-2 px-3 block mb-5 rounded-sm" onClick={() => navigate("/admin/ProductList")}>
                      Product
                    </label>
                    <input type="radio" id="manage-users" name="menu" />
                    <label htmlFor="manage-users" className="py-2 px-3 block mb-5 rounded-sm" onClick={() => navigate("/admin/Userlist")}>
                      Manage Users
                    </label>
                    <input type="radio" id="logout" name="menu" />
                    <label htmlFor="logout" className="py-2 px-3 block mb-5 rounded-sm" onClick={logouthandler}>
                      Logout
                    </label>

                  <div className="glider-container">
                    <div className="glider"></div>
                </div>
              </motion.div>
        
        ) : (
            null )
        }
</div>

  );
};

export default ProfileMenu;