import axios from "axios"

export const axiosInstance =axios.create({
    baseURL:import.meta.env.VITE_API_URL||'http://localhost:8000/',
    headers:{
        "Content-Type":'application/json',
        // the server's csrfGuard rejects write requests without this header
        "X-Requested-With":'XMLHttpRequest'
    },
    withCredentials:true
})