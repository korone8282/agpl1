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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[100rem] mx-auto space-y-12 text-start">

      <h3 className='text-center text-2xl my-auto'>UserList</h3>
{
  error ? (<div className='sm:max-lg:mt-4 text-3xl font-bold text-center my-96'>Check Wifi Connection</div>
  ):(
    <div>
      {
        loading ? (<Loader/>
        ):(
          <div className="rounded-lg border bg-card max-h-[35rem] overflow-auto">
        <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>S No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Registered On</TableHead>
                <TableHead>Access Type</TableHead>
              </TableRow>
            </TableHeader>

<TableBody>
{
users?.map((val,ind)=>(
  <TableRow key={ind}>
    <TableCell>{ind+1}</TableCell>
    <TableCell>{val.fname} </TableCell>
    <TableCell>{val.email} </TableCell>
    <TableCell>{val.createdAt?.substring(0,10)} </TableCell>
    <TableCell>{val.isAdmin?"Admin":"User"} </TableCell>
  </TableRow>
))
}
</TableBody>

          </Table>
        </div>
        )
      }
    </div>
  )
}

      </div>
    </div>
    </PageTransition>

  );
}

export default UserList