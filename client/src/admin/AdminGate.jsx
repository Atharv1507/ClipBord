import { lazy, Suspense } from 'react'
import NotFound from '../pages/NotFound'
import PageLoader from '../components/ui/PageLoader'
import { hasAdminHint } from '../utils/adminHint'

// The dashboard code downloads only for a browser where the admin has logged in.
const AdminApp = lazy(() => import('./AdminApp'))

// Anyone without the hint gets the ordinary 404 page straight away, with no
// request to the server, so /admin looks like any other wrong URL. The hint
// isn't the lock: AdminApp still asks the server, which is the real check.
function AdminGate() {
  if (!hasAdminHint()) return <NotFound />
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminApp />
    </Suspense>
  )
}

export default AdminGate
