import axios from 'axios';
//test cubaan satu dua tiga gfgfgfg fgf sds sdsds
// Dapatkan VITE_API_BASE_URL dari pemboleh ubah persekitaran Vercel/Vite
// Jika Vercel tidak menyediakannya, gunakan localhost sebagai fallback (hanya untuk testing local)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: BASE_URL,
});

export default api;