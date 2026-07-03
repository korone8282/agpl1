import React from 'react'
import Home from './pages/Home'
import { Route,Routes } from 'react-router-dom'
import Header from './components/Header'
import Filiing from './pages/Sections/Filiing'
import Dispatch from './pages/Sections/Dispatch'
import Kitchen from './pages/Sections/Kitchen'
import Login from './pages/User/Login'
import SignUp from './pages/User/SignUp'
import DataLog from './components/DataLog'
import AdminRoute from './components/AdminRoute'
import UsersList from './pages/Admin/UsersList'
import OtpLogin from './pages/User/OtpLogin'
import Profile from './pages/User/Profile'
import AllDataKitchen from './pages/Today/AllDataKitchen'
import AllDataDispatch from './pages/Today/AllDataDispatch'
import AllDataFilling from './pages/Today/AllDataFilling'
import UpdateProfile from './pages/User/UpdateProfile'
import Buyer from './pages/Admin/Buyer'
import BuyerProducts from './pages/Admin/BuyerProducts'
import Monthly from './pages/Admin/Monthly'
import Product from './pages/Admin/Product'
import DvN from './pages/Admin/DvN'
import ProductionGoal from './pages/Admin/ProductionGoal'
import Production from './pages/Admin/Production'
import KvF from './pages/Admin/KvF'
import Inventory from './pages/Admin/Inventory'
import ProductData from './pages/Admin/ProductData'
import Left from './pages/Admin/Left'
import DispatchReport from './pages/Admin/DispatchReport'
import Exports from './pages/Admin/Exports'
import Container from './pages/Admin/Container'
import ContainerList from './pages/Admin/ContainerList'
import DispGraph from './pages/Admin/DispGraph'
import FillGraph from './pages/Admin/FillGraph'
import KitchenGraph from './pages/Admin/KitchenGraph'
import MonthlyGraphOne from './pages/Admin/MonthlyGraphOne'
import MonthlyGraphTwo from './pages/Admin/MonthlyGraphTwo'
import MonthlyGraphThree from './pages/Admin/MonthlyGraphThree'
import Graph from './pages/Admin/Graph'
import Dispatched from './pages/Admin/Dispatched'
import Pouch from './pages/Admin/Pouch'
import Month from './components/Month'
import { AnimatePresence } from 'framer-motion'

const App = () => {
  
  return (
<div>

<Header/>

<AnimatePresence mode='wait'>

<Routes>

<Route path='/' element={<Home/>}/>

<Route path="/admin" element={<AdminRoute/>}>
   <Route path='Container-List/:id' element={<Container/>} />
   <Route path='Container-List' element={<ContainerList/>} />
   <Route path='Profile/:id' element={<Profile/>} />
   <Route path='ProductData' element={<ProductData/>} />
   <Route path='Left' element={<Left/>} />
   <Route path='Filling-List' element={<Inventory/>} />
   <Route path='updateProfile/:id' element={<UpdateProfile/>} />
   <Route path='Monthly-Data' element={<Monthly/>} />
   <Route path='Production-Goal' element={<ProductionGoal/>} />
   <Route path='Production' element={<Production/>} />
   <Route path='Create-Data-Kitchen' element={<AllDataKitchen/>} />
   <Route path='Create-Exports' element={<Exports/>} />
   <Route path='Create-Data-Dispatch' element={<AllDataDispatch/>} />
   <Route path='Create-Data-Filling' element={<AllDataFilling/>} />
   <Route path='UserList' element={<UsersList/>}></Route>
   <Route path='Graph/Monthly-Dispatch' element={<MonthlyGraphOne/>}></Route>
   <Route path='Graph/Monthly-Filling' element={<MonthlyGraphTwo/>}></Route>
   <Route path='Graph/Monthly-Kitchen' element={<MonthlyGraphThree/>}></Route>
   <Route path='Kitchen/:month' element={<Kitchen/>} />
   <Route path='Filling/:month' element={<Filiing/>} />
   <Route path='Dispatch/:month' element={<Dispatch/>} />
   <Route path='Month' element={<Month/>} />
   <Route path=':section/:month' element={<DataLog/>} />
   <Route path='BuyerList' element={<Buyer/>}></Route>
   <Route path='ProductList' element={<Product/>}></Route>
   <Route path='Product-Data' element={<BuyerProducts/>}></Route>
   <Route path='Day-Night' element={<DvN/>}></Route>
   <Route path='Pouch' element={<Pouch/>}></Route>
   <Route path='Daily-List' element={<KvF/>}></Route>
   <Route path='Dispatched/Dispatch-Report' element={<DispatchReport/>}></Route>
   <Route path='Graph/Dispatch-Graph' element={<DispGraph/>}></Route>
   <Route path='Graph/Filling-Graph' element={<FillGraph/>}></Route>
   <Route path='Graph/Kitchen-Graph' element={<KitchenGraph/>}></Route>
   <Route path='Graph' element={<Graph/>}></Route>
   <Route path='Dispatched' element={<Dispatched/>}></Route>
</Route>

<Route path='Login' element={<Login/>} />
<Route path='SignUp' element={<SignUp/>}/>
<Route path='OtpLogin' element={<OtpLogin/>}/>

</Routes>

</AnimatePresence>


</div>

  )
}

export default App

