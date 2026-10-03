import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { axiosInstance } from '../axiosCalls/axios'
import Logo from '../components/Logo'
import Toast from '../components/Toast'
import { getErrorMessage } from '../utils/getErrorMessage'
import { useAuth } from '../context/AuthContext'


const INITIAL_FORM = {
  email: '',
  password: '',
}

const fieldClass =
  'w-full rounded-md bg-smoke px-4 py-3 text-[15px] text-paper placeholder:text-neutral-500 transition-colors outline-none focus:bg-raised'

const labelClass =
  'mb-2 block text-sm text-mute'

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
    }
    catch (err) {
      console.log(err)
      setError(getErrorMessage(err, 'Unable to log in. Please try again.'))
    }
    finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink px-6 py-16 text-paper">
      <Toast message={error} onClose={() => setError('')} />

      <div className="mx-auto w-full max-w-sm">
        <header className="mb-12">
          <Link to="/home" className="inline-block text-paper transition-colors hover:text-crimson-bright">
            <Logo className="h-14" />
          </Link>
          <h1 className="mt-8 font-display text-4xl leading-tight">
            Welcome back
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mute">
            Log in to pick up where you left off.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              className={fieldClass}
            />
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="password" className={labelClass + ' mb-0'}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-sm text-mute underline-offset-4 hover:text-paper hover:underline"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              className={fieldClass}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-crimson py-4 font-bold text-paper transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Logging in' : 'Log in'}
          </button>
        </form>

        <p className="mt-10 text-sm text-mute">
          New to Clipbord?{' '}
          <Link to="/signup" className="text-paper underline decoration-crimson-bright underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
