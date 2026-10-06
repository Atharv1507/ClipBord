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
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import AdminGate from './admin/AdminGate'
import { AuthProvider } from './context/AuthContext'
import { BagProvider } from './context/BagContext'
import BagDrawer from './components/BagDrawer'
import PublicRoute from './components/PublicRoute'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <BagProvider>
        <BrowserRouter>
          <Routes>
            <Route path='/' element={<Navigate to='/home' replace />} />
            <Route path='/signup' element={<PublicRoute><Signup /></PublicRoute>} />
            <Route path='/home' element={<Home />} />
            <Route path='/login' element={<PublicRoute><Login /></PublicRoute>} />
            <Route path='/product/:id' element={<ProductDetails />} />
            <Route path='/about' element={<About />} />
            <Route path='/catalogue' element={<Catalogue />} />
            <Route path='/cart' element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path='/checkout' element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path='/orders' element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path='/wishlist' element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path='/bookmarks' element={<Navigate to='/wishlist' replace />} />
            {/* Looks like the 404 page to anyone but the admin; the server checks every admin request. */}
            <Route path='/admin/*' element={<AdminGate />} />
            <Route path='*' element={<NotFound />} />
          </Routes>
          {/* One bag drawer for the whole app; the navbar and Add to bag open it. */}
          <BagDrawer />
        </BrowserRouter>
      </BagProvider>
    </AuthProvider>
  )
}

export default App
