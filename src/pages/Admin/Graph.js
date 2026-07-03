import React from 'react'
import { useNavigate} from 'react-router-dom';

const Graph = () => {

    const arr = ["Dispatch-Graph","Filling-Graph","Kitchen-Graph","Monthly-Dispatch",
      "Monthly-Filling","Monthly-Kitchen"];

    const navigate = useNavigate();

  return (
    <div>

                        <div className='flex flex-wrap gap-20 sm:max-lg:gap-9 my-16 justify-center mx-22 sm:max-lg:mx-1 '>
                            {
                                arr.map((val,ind)=>(
                                    <div key={ind}
                                         onClick={()=>navigate(val)}
                                         >
<div class="w-80 h-56 flex justify-center items-center relative hover:translate-y-2">

  
<div class="blur absolute inset-0 rounded-lg -translate-x-1 translate-y-1 bg-gradient-to-br from-cyan-500 to-violet-400"></div>

    
<div class="relative w-[98%] h-[96%] bg-black rounded-lg p-6">
    <p class="ml-2 text-4xl text-primary p-4">{val}</p>
</div>

</div>
                                    </div>
                                ))
                            }
                        </div>
    </div>
  )
}

export default Graph