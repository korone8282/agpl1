import styled from 'styled-components';

const TooltipCustom = styled.div`
padding: 5px 10px;
background: rgba(19, 19, 20, 8.5);
backdrop-filter: blur(5px);
font-size: 20px;
font-weight: bold;
color: #fff;
border: none;
border-radius: 10px;
outline: none;
>p {
display: flex;
align-items: center;
margin-bottom: 5px;
}
>div{
display: flex;
margin-bottom: 5px;
align-items: center;
}`

const Color = styled.div`
width: 20px;
height: 20px;
background: ${props => props.color};
margin-right: 10px;
border-radius: 5px;
border: 2px solid #fff`;

export const CustomToolTip = ({active, payload, label}) =>{

if (active && payload && payload.length) {
return(
<TooltipCustom>
<p>Date: {label}</p>
<div>
<Color color={payload[0].stroke}></Color>
{ `${payload[0].dataKey}: ${payload[0].value}`}
</div>
<div>
<Color color={payload[1].stroke}></Color>
{ `${payload[1].dataKey}: ${((payload[1].value)/10000).toFixed(2)}`}
</div>  
</TooltipCustom>
)}
return null
}