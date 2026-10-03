import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Signup from './pages/Signup'
import Login from './pages/Login'
import Home from './pages/Home'
import ProductDetails from './pages/ProductDetails'
import About from './pages/About'
import Catalogue from './pages/Catalogue'
import NotFound from './pages/NotFound'
import Cart from './pages/Cart'
import Wishlist from './pages/Wishlist'
import { AuthProvider } from './context/AuthContext'
import PublicRoute from './components/PublicRoute'
import ProtectedRoute from './components/ProtectedRoute'
function App() {
  return(
<AuthProvider>
    <BrowserRouter>
    <Routes>
        <Route path='/' element={<Navigate to='/home' replace/>}/>
        <Route path='/signup' element={<PublicRoute><Signup/></PublicRoute>}/>
        <Route path='/home' element={<Home/>}/>
        <Route path='/login' element={<PublicRoute><Login/></PublicRoute>}/>
        <Route path='/product/:id' element={<ProductDetails/>}/>
        <Route path='/about' element={<About/>}/>
        <Route path='/catalogue' element={<Catalogue/>}/>
        <Route path='/cart' element={<ProtectedRoute><Cart/></ProtectedRoute>}/>
        <Route path='/wishlist' element={<ProtectedRoute><Wishlist/></ProtectedRoute>}/>
        <Route path='*' element={<NotFound/>}/>
    </Routes>
    </BrowserRouter>
</AuthProvider>
  )

}

export default App
