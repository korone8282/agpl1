import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    userinfo: localStorage.getItem("userinfo")?JSON.parse(localStorage.getItem("userinfo"))
    : null,
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setcredentials: (state,action) => {
            state.userinfo = action.payload;
            localStorage.setItem("userinfo",JSON.stringify(action.payload));
        },
        logout: (state,action) => {
            state.userinfo = null;
            localStorage.clear();
        },
    }
});

export const {logout,setcredentials} = authSlice.actions;
export default authSlice.reducer;
