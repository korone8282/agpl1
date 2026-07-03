import React, { useEffect, useState } from 'react';
import { RiEditBoxLine } from 'react-icons/ri';
import IconBtn from '../../components/IconBtn';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useNavigate, useParams } from 'react-router-dom';
import { PROFILE_URL } from '../../redux/Utils/constants';
import { useSelector } from 'react-redux';
import Loader from '../../components/Loader';
import PageTransition from '../PageTransition';

const Profile = () => {
  const [user, setUser] = useState({});
  const { userinfo } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();

  useEffect(() => {
    const profileFetcher = async () => {
      try {
        const res = await apiConnector(
          `${PROFILE_URL}/${id}`,
          'GET',
          null,
          { Authorization: `Bearer ${userinfo.token}` }
        );
        setUser(res.data.data);
        setLoading(false);
      } catch (e) {
        console.log(e);
        setLoading(false); 
      }
    };

    profileFetcher();
  }, [id, userinfo.token]);

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {loading ? (
        <Loader />
      ) : (
        <PageTransition>
        <div className="max-w-4xl mx-auto flex flex-col gap-6 h-auto">
          <h1 className="mt-6 mb-4 text-2xl sm:text-3xl text-center font-bold text-[#f59e0b]">
            My Profile
          </h1>

          <div className="flex flex-col items-center justify-center rounded-md text-[#f59e0b] bg-black border-[#f59e0b] border-2 p-4 sm:p-6 md:p-8 shadow-md">
            <div className="flex flex-col sm:flex-row items-center justify-center w-full gap-4 sm:gap-8">
              <div className="flex items-center justify-center">
                <img
                  src={user?.image}
                  alt="Profile"
                  className="aspect-square w-20 sm:w-24 border-2 border-black rounded-full object-cover"
                />
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <p className="text-lg sm:text-xl font-semibold">
                  {user?.fname || 'N/A'}
                </p>
                <p className="text-sm sm:text-base max-w-xs sm:max-w-none overflow-hidden text-ellipsis">
                  {user?.email || 'No email provided'}
                </p>
              </div>
              <IconBtn
                text="Edit"
                onclick={() => {
                  navigate(`/admin/updateProfile/${userinfo._id}`);
                }}
                className="mt-4 sm:mt-0"
              >
                <RiEditBoxLine />
              </IconBtn>
            </div>
          </div>

          <div className="flex flex-col gap-y-4 rounded-md text-[#f59e0b] border-[#f59e0b] bg-black border-2 p-4 sm:p-6 md:p-8 shadow-md">
            <div className="flex w-full items-center justify-between">
              <p className="text-lg sm:text-xl font-semibold">About</p>
              <IconBtn
                text="Edit"
                onclick={() => {
                  navigate(`/admin/updateProfile/${userinfo._id}`);
                }}
              >
                <RiEditBoxLine />
              </IconBtn>
            </div>
            <p className="text-sm sm:text-base font-medium overflow-wrap break-words max-w-full">
              {user?.about ?? 'Write Something About Yourself'}
            </p>
          </div>

          <div className="flex flex-col gap-y-4 rounded-md border-[#f59e0b] border-2 bg-black text-[#f59e0b] p-4 sm:p-6 md:p-8 shadow-md">
            <div className="flex w-full items-center justify-between">
              <p className="text-lg sm:text-xl font-semibold">Personal Details</p>
              <IconBtn
                text="Edit"
                onclick={() => {
                  navigate(`/admin/updateProfile/${userinfo._id}`);
                }}
              >
                <RiEditBoxLine />
              </IconBtn>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[20rem] overflow-y-auto">
              <div>
                <p className="mb-2 text-sm sm:text-base">First Name</p>
                <p className="text-sm sm:text-base font-medium">
                  {user?.fname || 'N/A'}
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm sm:text-base">Email</p>
                <p className="text-sm sm:text-base font-medium overflow-hidden text-ellipsis max-w-full">
                  {user?.email || 'No email provided'}
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm sm:text-base">Gender</p>
                <p className="text-sm sm:text-base font-medium">
                  {user?.gender ?? 'Add Gender'}
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm sm:text-base">Date Of Birth</p>
                <p className="text-sm sm:text-base font-medium">
                  {user?.dob?.substring(0, 10) ?? 'Add DOB'}
                </p>
              </div>
            </div>
          </div>
        </div>
        </PageTransition>
      
      )}
    </div>
  );
};

export default Profile;