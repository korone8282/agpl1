import React from 'react'
import styled from 'styled-components';
import Chart from './Chart';

const Wrapper = ({data,dataKey}) => {
  
    const CardWrapper = styled.div`
     padding:3px;
     background-image: linear-gradient(60deg , #000 0%, #00008B  100%);
     border-radius: 10px;`;
   
  return (
    <CardWrapper className='w-[99%] mx-auto my-3'>
      <Chart data={data} dataKey={dataKey}/>
    </CardWrapper>
  )
}

export default Wrapper
