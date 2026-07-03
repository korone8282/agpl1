import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    userInfo: localStorage.getItem("userInfo") && localStorage.getItem("userInfo") !== "undefined"
      ? JSON.parse(localStorage.getItem("userInfo"))
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
