import React, {useState} from 'react'
import Loader from '../../components/Loader';
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { DATA_URL } from '../../redux/Utils/constants';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/Table';
import { Input } from "../../components/Input";
import PageTransition from '../PageTransition';

const DvN = () => {

    const [loading, setLoading] = useState(0);
    const [error, setError] = useState(0);
    const [data, setData] = useState();

    const [info, setInfo] = useState({
        start:"",
        end:"",
    });

    const {userinfo} = useSelector(state => state.auth);

    const inputHandler = async(e) =>{
        setInfo((prevData) => ({
          ...prevData,
          [e.target.name]: e.target.value
        }));
      }

    async function getData(){
        try {
        setError(0);
        setLoading(1);
        
        const res = await apiConnector(`${DATA_URL}/DvN`,"PUT",info,{Authorization: `Bearer ${userinfo.token}`});

        setData(res.data.data);

        setLoading(0);
        

        } catch (e) {
          setError(1);
          console.log(e);
        }
      }

return (
  <PageTransition>
      <div className="min-h-screen bg-background p-6">
          <div className="max-w-[100rem] mx-auto space-y-12 text-start">
    
    
          <div className="flex flex-col justify-center items-center mb-6 md:flex-row md:justify-between">

              <div className="flex flex-col gap-4 md:flex-row md:gap-4 items-center">Start:
                <Input
                  type="date"
                  name="start"
                  onChange={ e => inputHandler(e) }
                  className="bg-[#2A2A2A] border-none"
                />
                <Input
                  type="date"
                  name='end'
                  onChange={ e => inputHandler(e) }
                  className="bg-[#2A2A2A] border-none"
                /> :End
              </div>

              <div className="flex items-center gap-4">
            <div className="bg-[#1E1E1E] rounded-lg px-6 text-orange-500  border border-orange-500 hover:border-black text-lg p-2.5 mx-2 my-3 cursor-pointer hover:bg-orange-500 hover:text-black"
                 onClick={getData}>
              <span>Submit</span>
            </div>
</div>
        </div>
    

    
    {
      error ? (<div className='sm:max-lg:mt-4 text-3xl font-bold text-center my-96'> No Data Entry Found</div>
      ):(
        <div>
          {
            loading ? (<Loader/>
            ):(
              <div className="rounded-lg border bg-card">
            <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead>Day Time</TableHead>
                    <TableHead>No. Of Batch</TableHead>
                    <TableHead>Yield (kg)</TableHead>
                    <TableHead>Pouch Filled</TableHead>
                    <TableHead>Pouch Packed</TableHead>
                    <TableHead>Pouch Wasted</TableHead>
                    <TableHead>Wastage (kg)</TableHead>
                    <TableHead>Box</TableHead>
                    <TableHead>Worker Quantity</TableHead>
                  </TableRow>
                </TableHeader>
    
                {
    data ? (
      <TableBody>

                 <TableRow className="hover:bg-muted/50">
                      <TableCell>Day</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Day").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.batchQuantity,0),0)}</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Day").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.yield*obj.batchQuantity,0),0).toFixed(2)}</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Day").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0),0)}</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Day").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.pouchPacked,0),0)}</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Day").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.empty,0),0)}</TableCell>
                      <TableCell>{(data.filter(item=>item.dayTime === "Day").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.filled,0),0) ).toFixed(2)}</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Day").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.box,0),0)}</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Day" && item.sectionMain !== "Dispatch").reduce((acc,obj)=>  acc+obj.dataList.reduce( (accumulator, obj,index) => accumulator + (index===0?obj.workersQuantity:0),0),0)}</TableCell>
                 </TableRow>

                 <TableRow className="hover:bg-muted/50">
                      <TableCell>Night</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Night").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.batchQuantity,0),0)}</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Night").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.yield*obj.batchQuantity,0),0).toFixed(2)}</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Night").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0),0)}</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Night").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.pouchPacked,0),0)}</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Night").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.empty,0),0)}</TableCell>
                      <TableCell>{(data.filter(item=>item.dayTime === "Night").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.filled,0),0) ).toFixed(2)}</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Night").reduce((acc,obj)=> acc+obj.dataList.reduce( (accumulator, obj) => accumulator + obj.box,0),0)}</TableCell>
                      <TableCell>{data.filter(item=>item.dayTime === "Night" && item.sectionMain !== "Dispatch").reduce((acc,obj)=>  acc+obj.dataList.reduce( (accumulator, obj,index) => accumulator + (index===0?obj.workersQuantity:0),0),0)}</TableCell>
                 </TableRow>
                 
               
      </TableBody>
    ) : (
      <TableCell colSpan={5} className='text-xl'>No Data Entry</TableCell>
    )
  }
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


export default DvN
