import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { axiosInstance } from '../axiosCalls/axios'
import AuthShell, { SubmitArrow, fieldClass, labelClass, submitClass } from '../components/AuthShell'
import Toast from '../components/Toast'
import { getErrorMessage } from '../utils/getErrorMessage'
import { useAuth } from '../context/AuthContext'

const INITIAL_FORM = {
  email: '',
  password: '',
}

function Login() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setUser } = useAuth()

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await axiosInstance.post('/customer/login', form)
      // The login response has no user data, so ask who's logged in now that the cookie is set.
      const res = await axiosInstance.get('/customer/me')
      setUser(res.data.userData)
      navigate('/home')
    } catch (err) {
      console.log(err)
      setError(getErrorMessage(err, 'Unable to log in. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Log in"
      intro="Your bag and bookmarks follow you to any device."
      footer={<>New to Clipbord? <Link to="/signup" className="font-semibold text-fg underline underline-offset-[3px]">Create an account</Link></>}
    >
      <Toast message={error} onClose={() => setError('')} />
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" value={form.email} onChange={handleChange} className={fieldClass} />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="password" className="text-[13px] font-semibold">Password</label>
            <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="text-[13px] text-drawer-soft underline-offset-4 hover:text-drawer-fg hover:underline">
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input id="password" name="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder="Your password" value={form.password} onChange={handleChange} className={fieldClass} />
        </div>
        <button type="submit" disabled={submitting} className={submitClass}>
          {submitting ? 'Logging in…' : 'Log in'}
          <SubmitArrow />
        </button>
      </form>
    </AuthShell>
  )
}

export default Login
