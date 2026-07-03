import { createSlice} from "@reduxjs/toolkit";

const initialState =  localStorage.getItem("dataList") ? JSON.parse(localStorage.getItem("dataList")) : [
    [],
    [],
    [],
    [],
];

const localSlice = createSlice({
    name: "local",
    initialState,
    reducers: {
        setData: (state,action) => {
            state[action.payload.val].push(action.payload.formData);
            localStorage.setItem("dataList",JSON.stringify(state));
        },
    
        deleteData: (state,action) => {
            state[action.payload.val].splice(action.payload.index,1);
            localStorage.setItem("dataList",JSON.stringify(state));
        },

        emptyData: (state,action) => {
          state[action.payload] = [];
          localStorage.setItem("dataList",JSON.stringify(state));
        },
    }
});

export const {setData,deleteData,emptyData} = localSlice.actions;
export default localSlice.reducer;
