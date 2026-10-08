import { createContext, useContext, useEffect, useState } from 'react'
import { axiosInstance } from '../axiosCalls/axios'
import { useDispatch } from 'react-redux'
import { loadWishlistIds, wishlistCleared } from '../store/wishlistSlice'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const dispatch = useDispatch()

  useEffect(() => {
    axiosInstance
      .get('customer/me')
      .then((response) => {
        setUser(response.data.userData)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Covers app load, login, signup and logout: whenever the logged-in customer
  // changes, fetch their wishlist, or empty it when nobody is logged in.
  const userId = user?._id
  useEffect(() => {
    if (userId) dispatch(loadWishlistIds())
    else dispatch(wishlistCleared())
  }, [dispatch, userId])

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
