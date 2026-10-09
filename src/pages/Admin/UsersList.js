import React, { useEffect, useState } from 'react'
import { apiConnector } from '../../redux/Utils/apiConnector'
import { USERINFO_URL } from '../../redux/Utils/constants';
import { useSelector } from 'react-redux';
import Loader from '../../components/Loader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import PageTransition from '../PageTransition';

const UserList = () => {

  const [users, setUsers] = useState([]);
  const [error, setError] = useState(0);
  const [loading, setLoading] = useState(1);

  const {userinfo} = useSelector(state=>state.auth);
  
  useEffect(() => {

    async function displayUsers() {
      setError(0);
      try {
        const res = await apiConnector(USERINFO_URL,"GET",null,{Authorization: `Bearer ${userinfo.token}`});
        setUsers(res.data.users);

        setLoading(0);
      } catch (error) {
        setError(1);
        console.log(error);
      }
    }

    displayUsers();
  }, [userinfo.token]);
 
  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-black text-white py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                  Administration
                </span>
                <span className="text-zinc-500 text-xs font-mono">• Security & Access</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                User Management Directory
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                All registered operators, administrators, and shift supervisors with portal access.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs font-mono">
                {users?.length || 0} Total Users
              </span>
            </div>
          </div>

          {error ? (
            <div className="w-full p-12 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl">
              <p className="text-lg font-bold text-rose-400">Unable to load users</p>
              <p className="text-sm text-zinc-400 mt-1">Please verify network connection and authorization privileges.</p>
            </div>
          ) : loading ? (
            <Loader />
          ) : (
            <div className="w-full rounded-2xl border border-white/10 bg-[#0d0d0d]/90 overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white/5 border-b border-white/10">
                      <TableHead className="text-zinc-400 font-mono text-xs uppercase tracking-wider py-4">#</TableHead>
                      <TableHead className="text-zinc-400 font-mono text-xs uppercase tracking-wider py-4">Name</TableHead>
                      <TableHead className="text-zinc-400 font-mono text-xs uppercase tracking-wider py-4">Email Address</TableHead>
                      <TableHead className="text-zinc-400 font-mono text-xs uppercase tracking-wider py-4">Registered Date</TableHead>
                      <TableHead className="text-zinc-400 font-mono text-xs uppercase tracking-wider py-4">Access Role</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {users?.map((val, ind) => (
                      <TableRow key={ind} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <TableCell className="font-mono text-xs text-zinc-500 py-3.5">{ind + 1}</TableCell>
                        <TableCell className="font-semibold text-white py-3.5">{val.fname}</TableCell>
                        <TableCell className="text-zinc-300 font-mono text-xs py-3.5">{val.email}</TableCell>
                        <TableCell className="text-zinc-400 font-mono text-xs py-3.5">
                          {val.createdAt?.substring(0, 10)}
                        </TableCell>
                        <TableCell className="py-3.5">
                          {val.isAdmin ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 font-mono">
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-zinc-300 border border-white/10 font-mono">
                              User
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default UserList