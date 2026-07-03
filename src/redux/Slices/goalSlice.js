import { createSlice } from "@reduxjs/toolkit";

const initialState =  localStorage.getItem("goal") ? JSON.parse(localStorage.getItem("goal")) : { date:new Date().toJSON().slice(0, 10)}

const goalSlice = createSlice({
    name: "goal",
    initialState,
    reducers: {
        setGoalDate: (state,action) => {
        state.date = action.payload;
        localStorage.setItem("goal",JSON.stringify(state));
        },
    }
});

export const {setGoalDate} = goalSlice.actions;
export default goalSlice.reducer;
