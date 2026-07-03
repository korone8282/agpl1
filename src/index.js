import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import {BrowserRouter} from 'react-router-dom'
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import store from './redux/store';
import { Provider } from "react-redux";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { CLIENT_ID } from './redux/Utils/constants';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    <ToastContainer/>
  </BrowserRouter>
  </Provider>
);

