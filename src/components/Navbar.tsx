import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [userId, setUserId] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single()
        if (data) {
          setUsername(data.username)
          setUserId(user.id)
          setAvatarUrl(data.avatar_url || '')
        }
      }
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="navbar bg-base-200 px-4 shadow-md">
      <div className="flex-1 gap-2">
        <Link to="/dashboard" className="btn btn-ghost text-xl font-bold">
          GameOn
        </Link>
        <Link to="/dashboard" className="btn btn-ghost btn-sm">Tournaments</Link>
        <Link to="/invites" className="btn btn-ghost btn-sm">Invites</Link>
        <Link to="/teams" className="btn btn-ghost btn-sm">Teams</Link>
        <Link to="/players" className="btn btn-ghost btn-sm">Players</Link>
      </div>

      <div className="flex-none">
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
            <div className="rounded-full w-10 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="bg-neutral text-neutral-content rounded-full w-10 h-10 flex items-center justify-center">
                  <span className="text-sm">{username?.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-200 rounded-box z-50 mt-3 w-52 p-2 shadow">
            <li className="menu-title"><span>{username}</span></li>
            <li><Link to={`/profile/${userId}`}>My Profile</Link></li>
            <li><Link to="/profile/settings">Profile Settings</Link></li>
            <li><button onClick={handleLogout} className="text-error">Logout</button></li>
          </ul>
        </div>
      </div>
    </div>
  )
}