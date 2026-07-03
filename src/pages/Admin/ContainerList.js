import React, {useState, useEffect} from 'react'
import { apiConnector } from '../../redux/Utils/apiConnector';
import { useSelector } from 'react-redux';
import { EXPORT_URL } from '../../redux/Utils/constants';
import Loader from '../../components/Loader'
import { useNavigate} from 'react-router-dom';
import '../../components/TestTube.css';

const ContainerList = () => {

    const {userinfo} = useSelector(state => state.auth);
    
    const [loading, setLoading] = useState(1);
    const [error, setError] = useState(0);
    const [arr, setArr] = useState([]);
    const [array, setArray] = useState([]);

    const [info] = useState({
      start:new Date(new Date().setDate(new Date().getDate() - 60)).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
  });

    const navigate = useNavigate();

    useEffect(() => {
        
        async function getData(){
            try {
            setError(0);
            setLoading(1);
            
            const res = await apiConnector(`${EXPORT_URL}/list`,"GET",null,{Authorization: `Bearer ${userinfo.token}`});
            setArr(res.data.data);
    
            setLoading(0);
            
    
            } catch (e) {
              setError(1);
              console.log(e);
            }
          }

          async function getInfo(){
            try {
            setError(0);
            setLoading(1);
            
            const res = await apiConnector(`${EXPORT_URL}/read`,"PUT",info,{Authorization: `Bearer ${userinfo.token}`});
    
            setArray(res.data.data);
          
            setLoading(0);
          
            } catch (e) {
              setError(1);
              console.log(e);
            }
          }
          
          getInfo();
          getData();

    }, [userinfo.token,info]);
    
  return (
    <div>
      {
        error ? (<div className='text-center font-bold text-7xl mt-64 text-[#f59e0b]'>No Data Entry Found</div>
        ) : (
            <div>
                {
                    loading ? (<Loader/>
                    ) : (
                        <div className='flex flex-wrap gap-12 md:gap-16 my-16 mx-1'>
                            {
                                arr.map((val,ind)=>(
                                    <div key={ind}
                                         onClick={()=>navigate(`${val._id}`)}
                                         >
                                 
<div className="w-72 h-48 flex justify-center my-8 items-center relative hover:translate-y-2 cursor-pointer">
    
<div className="tube bg-black rounded-lg">
<div className="shine"></div>
  <div className="body">
    <div className="liquid max-h-[75%]" style={{height: `${(array.reduce((acc, obj) => acc + obj.dataList.filter(item => item.container === val.name).reduce((acc, obj) => acc + obj.pouchQuantity, 0), 0)/79200)*100}%`}}>
      <div className="percentage"></div>
    </div>
  </div>
    <p className="ml-2 text-4xl text-primary p-3">{val.name}</p>
    <div className='text-black text-2xl font-bold left-[50%] translate-x-[-50%] z-10 absolute bottom-20'>{((array.reduce((acc, obj) => acc + obj.dataList.filter(item => item.container === val.name).reduce((acc, obj) => acc + obj.pouchQuantity, 0), 0)/79200)*100).toFixed(1)}%</div>
    
    <div className='text-black text-2xl font-bold left-[50%] translate-x-[-50%] z-10 absolute bottom-10'>{((array.reduce((acc, obj) => acc + obj.dataList.filter(item => item.container === val.name).reduce((acc, obj) => acc + obj.pouchPacked, 0), 0)/79200)*100).toFixed(1)}%</div>

</div>

</div>
                                    </div>
                                ))
                            }
                        </div>
                    )
                }
            </div>
        )
      }
    </div>
  )
}

export default ContainerList
