import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Signup from './pages/Signup'
import Login from './pages/Login'
import Home from './pages/Home'
import ProductDetails from './pages/ProductDetails'
import About from './pages/About'
import Catalogue from './pages/Catalogue'

function App() {
  return(
    <BrowserRouter>
    <Routes>
        <Route path='/' element={<Navigate to='/home' replace/>}/>
        <Route path='/signup' element={<Signup/>}/>
        <Route path='/home' element={<Home/>}/>
        <Route path='/login' element={<Login/>}/>
        <Route path='/product/:id' element={<ProductDetails/>}/>
        <Route path='/about' element={<About/>}/>
        <Route path='/catalogue' element={<Catalogue/>}/>
    </Routes>
    </BrowserRouter>
  )

}

export default App
