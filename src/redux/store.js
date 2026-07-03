import {configureStore} from '@reduxjs/toolkit';
import authReducer from "./Slices/authSlice";
import dataReducer from "./Slices/dateSlice";
import localReducer from "./Slices/localSlice";
import goalSlice from './Slices/goalSlice';

const store = configureStore({
    reducer:{
        auth: authReducer,
        data: dataReducer,
        local: localReducer,
        goal: goalSlice
    },

});


export default store;