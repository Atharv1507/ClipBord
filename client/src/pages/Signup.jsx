import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { axiosInstance } from '../axiosCalls/axios'
import AuthShell, { SubmitArrow, fieldClass, labelClass, submitClass } from '../components/AuthShell'
import Toast from '../components/Toast'
import { getErrorMessage } from '../utils/getErrorMessage'
import { useAuth } from '../context/AuthContext'

const INITIAL_FORM = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
}

function Signup() {
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
      const res = await axiosInstance.post('/customer/register', form)
      // Register logs the new customer in and sends them back, so no /customer/me needed.
      setUser(res.data.data.newCustomer)
      navigate('/home')
    } catch (err) {
      console.log(err)
      setError(getErrorMessage(err, 'Unable to create your account. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const fields = [
    { name: 'fullName', label: 'Full name', type: 'text', autoComplete: 'name', placeholder: 'Ada Lovelace' },
    { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', placeholder: 'you@example.com' },
    { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel', placeholder: '98765 43210', inputMode: 'numeric' },
  ]

  return (
    <AuthShell
      title="Create account"
      intro="Save bookmarks and keep your bag on every device."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-fg underline underline-offset-[3px]">Log in</Link></>}
    >
      <Toast message={error} onClose={() => setError('')} />
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label htmlFor={f.name} className={labelClass}>{f.label}</label>
            <input id={f.name} name={f.name} type={f.type} required autoComplete={f.autoComplete} inputMode={f.inputMode} placeholder={f.placeholder} value={form[f.name]} onChange={handleChange} className={fieldClass} />
          </div>
        ))}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="password" className="text-[13px] font-semibold">Password</label>
            <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="text-[13px] text-drawer-soft underline-offset-4 hover:text-drawer-fg hover:underline">
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input id="password" name="password" type={showPassword ? 'text' : 'password'} required autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={handleChange} className={fieldClass} />
        </div>
        <button type="submit" disabled={submitting} className={submitClass}>
          {submitting ? 'Creating account…' : 'Create account'}
          <SubmitArrow />
        </button>
      </form>
    </AuthShell>
  )
}

export default Signup
