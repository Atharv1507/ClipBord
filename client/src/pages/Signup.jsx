import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { axiosInstance } from '../axiosCalls/axios'
import Logo from '../components/Logo'
import Toast from '../components/Toast'
import { getErrorMessage } from '../utils/getErrorMessage'


const INITIAL_FORM = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
}

const fieldClass =
  'w-full rounded-md bg-smoke px-4 py-3 text-[15px] text-paper placeholder:text-neutral-500 transition-colors outline-none focus:bg-raised'

const labelClass =
  'mb-2 block text-sm text-mute'

function Signup() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate=useNavigate()
  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    console.log('signup payload', form)
    try {
      await axiosInstance.post('/customer/register',form)
      navigate('/home')
    }
    catch (err) {
      console.log(err)
      setError(getErrorMessage(err, 'Unable to create your account. Please try again.'))
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
            Create an account
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mute">
            A few details and you&rsquo;re in.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="fullName" className={labelClass}>
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="Ada Lovelace"
              value={form.fullName}
              onChange={handleChange}
              className={fieldClass}
            />
          </div>

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
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              inputMode="numeric"
              autoComplete="tel"
              placeholder="98765 43210"
              value={form.phone}
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
              autoComplete="new-password"
              placeholder="At least 8 characters"
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
            {submitting ? 'Creating account' : 'Create account'}
          </button>
        </form>

        <p className="mt-10 text-sm text-mute">
          Already have an account?{' '}
          <Link to="/login" className="text-paper underline decoration-crimson-bright underline-offset-4">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
