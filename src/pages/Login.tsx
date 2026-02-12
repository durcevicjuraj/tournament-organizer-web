import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card bg-base-200 w-full max-w-md shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl mb-4">Login</h1>

          {error && <div className="alert alert-error"><span>{error}</span></div>}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <label className="form-control">
              <div className="label"><span className="label-text">Email</span></div>
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </label>

            <label className="form-control">
              <div className="label"><span className="label-text">Password</span></div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-2"
            >
              {loading ? <span className="loading loading-spinner"></span> : 'Login'}
            </button>
          </form>

          <p className="text-center text-sm mt-2">
            Don't have an account?{' '}
            <Link to="/register" className="link link-primary">Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}