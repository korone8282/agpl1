import React from 'react'
import { BarChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CustomToolTip } from './CustomToolTip';

const Chart = ({data,dataKey}) => {

  return (
    <div className='w-[100%] h-[45rem] sm:max-lg:h-96'>
    <ResponsiveContainer width="100%" height="100%">
        <BarChart
          width={500}
          height={400}
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 40,
          }}
        >
         <defs>
    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
    </linearGradient>
  </defs>
          <CartesianGrid stroke='#bdbdbd57' 
                         strokeDasharray="1 5"
                         vertical={false}  />

          <XAxis dataKey="name" 
                 stroke='#cccccc4d'
                 axisLine={false}
                 offset={0}
                 fontSize={25}
                 angle={-45}
                 fontWeight={600}
          />
          <YAxis stroke='#cccccc4d'
                 axisLine={false}
                 fontSize={15}
                 fontWeight={700}
          />
          <Tooltip content={<CustomToolTip/>}/>

          <Area type="monotone" 
                dataKey={dataKey} 
                stroke="#8884d8" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorUv)" />

        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default Chart