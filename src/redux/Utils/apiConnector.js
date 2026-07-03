import axios from "axios";

export const axiosInstance = axios.create({});

export const apiConnector = (url,method, bodyData, headers, params) => {
  return axiosInstance({
    method: `${method}`,
    withCredentials: true,
    credentials: 'include',
    url: `${url}`,
    data: bodyData ? bodyData : null,
    headers: headers ? headers : null,
    params: params ? params : null,
  });
};
            