import { createSlice } from "@reduxjs/toolkit";

const initialState =  localStorage.getItem("data") ? JSON.parse(localStorage.getItem("data")) : {
    date:"",
    days:31,
    month:1,
    section:"",
}

const dataSlice = createSlice({
    name: "data",
    initialState,
    reducers: {
        setDate: (state,action) => {
        state.date = action.payload;
        localStorage.setItem("data",JSON.stringify(state));
        },
        setMonth: (state, action) => {
        state.month = action.payload;
        localStorage.setItem("data",JSON.stringify(state));
        },
        setSection: (state, action) => {
        state.section = action.payload;
        localStorage.setItem("data",JSON.stringify(state));
        },
        setDays: (state, action) => {
        state.days = action.payload;
        localStorage.setItem("data",JSON.stringify(state));
        },
    }
});

export const {setDate,setMonth,setSection,setDays} = dataSlice.actions;
export default dataSlice.reducer;
