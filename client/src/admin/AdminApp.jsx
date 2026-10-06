import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import NotFound from '../pages/NotFound'
import PageLoader from '../components/ui/PageLoader'
import { axiosInstance } from '../axiosCalls/axios'
import { clearAdminHint } from '../utils/adminHint'
import { getErrorMessage } from '../utils/getErrorMessage'
import AdminLayout from './AdminLayout'
import Overview from './Overview'
import ProductsList from './ProductsList'
import ProductForm from './ProductForm'
import OrdersList from './OrdersList'
import OrderDetail from './OrderDetail'
import { ErrorPanel, PageHeader } from './ui'

// Asks the server whether this browser's admin session is still good, then
// shows the dashboard. A 404 means it isn't (expired, logged out elsewhere, or
// never was), and the page becomes the normal 404.
function AdminApp() {
  const [state, setState] = useState({ status: 'checking', email: '', error: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let ignore = false
    axiosInstance
      .get('/admin/me')
      .then(({ data }) => {
        if (!ignore) setState({ status: 'admin', email: data.email ?? '', error: '' })
      })
      .catch((err) => {
        if (ignore) return
        if (err.response?.status === 404) {
          clearAdminHint()
          setState({ status: 'denied', email: '', error: '' })
        } else {
          console.log(err)
          setState({ status: 'error', email: '', error: getErrorMessage(err, "Couldn't reach the server. Please try again.") })
        }
      })
    return () => {
      ignore = true
    }
  }, [attempt])

  useEffect(() => {
    document.title = 'Admin · Clipbord'
    return () => {
      document.title = 'Clipbord'
    }
  }, [])

  if (state.status === 'checking') return <PageLoader />
  if (state.status === 'denied') return <NotFound />
  if (state.status === 'error') {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas p-4 text-fg">
        <ErrorPanel
          message={state.error}
          onRetry={() => {
            setState({ status: 'checking', email: '', error: '' })
            setAttempt((n) => n + 1)
          }}
        />
      </div>
    )
  }

  return (
    <AdminLayout email={state.email}>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="products" element={<ProductsList />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductForm />} />
        <Route path="orders" element={<OrdersList />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="*" element={<PageHeader title="Not found" eyebrow="This admin page doesn't exist." />} />
      </Routes>
    </AdminLayout>
  )
}

export default AdminApp
