import React, { useEffect, useState } from 'react';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useNavigate, useParams } from 'react-router-dom';
import { PROFILE_URL } from '../../redux/Utils/constants';
import { useSelector } from 'react-redux';
import Loader from '../../components/Loader';
import { User, Mail, Calendar, Edit3, Shield, Info } from 'lucide-react';
import PageTransition from '../PageTransition';

const Profile = () => {
  const [user, setUser] = useState({});
  const { userinfo } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();

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

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6 text-start">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  Account Center
                </span>
                <span className="text-zinc-500 text-xs font-mono">• User Profile</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <User className="w-7 h-7 text-primary" />
                My Account Profile
              </h1>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/admin/updateProfile/${userinfo._id}`)}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-primary/20 transition-all cursor-pointer flex items-center gap-2 w-fit"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>

          {loading ? (
            <Loader />
          ) : (
            <div className="space-y-6">
              {/* Profile Card Header */}
              <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 p-6 sm:p-8 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <img
                    src={user?.image || "https://api.dicebear.com/7.x/initials/svg?seed=" + (user?.fname || "User")}
                    alt="Profile"
                    className="w-24 h-24 rounded-2xl border-2 border-primary/30 object-cover shadow-lg"
                  />
                  <div className="absolute -bottom-2 -right-2 p-1.5 rounded-lg bg-black border border-white/10 text-primary">
                    <Shield className="w-4 h-4" />
                  </div>
                </div>

                <div className="text-center sm:text-left space-y-1.5 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">{user?.fname || 'N/A'}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[12px] font-mono font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit mx-auto sm:mx-0">
                      Verified User
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 flex items-center justify-center sm:justify-start gap-2">
                    <Mail className="w-4 h-4 text-zinc-500" />
                    {user?.email || 'No email provided'}
                  </p>
                </div>
              </div>

              {/* Bio / About */}
              <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 p-6 backdrop-blur-xl shadow-xl space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <Info className="w-4 h-4 text-primary" />
                  <h3>About & Bio</h3>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                  {user?.about || 'No biographical information provided yet.'}
                </p>
              </div>

              {/* Personal Details Grid */}
              <div className="rounded-2xl border border-white/10 bg-[#0d0d0d]/90 p-6 backdrop-blur-xl shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white border-b border-white/5 pb-3">
                  Personal Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[13px] font-mono uppercase text-zinc-500">First Name</span>
                    <p className="text-sm font-semibold text-white">{user?.fname || 'N/A'}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[13px] font-mono uppercase text-zinc-500">Email Address</span>
                    <p className="text-sm font-semibold text-white">{user?.email || 'N/A'}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[13px] font-mono uppercase text-zinc-500">Gender</span>
                    <p className="text-sm font-semibold text-white">{user?.gender || 'Not specified'}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[13px] font-mono uppercase text-zinc-500">Date Of Birth</span>
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      {user?.dob?.substring(0, 10) || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Profile;