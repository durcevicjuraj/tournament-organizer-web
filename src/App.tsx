import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateTournament from './pages/CreateTournament'
import TournamentDetail from './pages/TournamentDetail'
import Profile from './pages/Profile'
import ProfileSettings from './pages/ProfileSettings'
import Team from './pages/Team'
import TeamSettings from './pages/TeamSettings'
import Navbar from './components/Navbar'
import CreateTeam from './pages/CreateTeam'
import TournamentInvites from './pages/TournamentInvites'
import TournamentMatchesPending from './pages/TournamentMatchesPending'
import Teams from './pages/Teams'
import Players from './pages/Players'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <BrowserRouter>
      {session && <Navbar />}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!session ? <Register /> : <Navigate to="/dashboard" />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/tournaments/create" element={session ? <CreateTournament /> : <Navigate to="/login" />} />
        <Route path="/tournaments/:id" element={session ? <TournamentDetail /> : <Navigate to="/login" />} />
        <Route path="/profile/:id" element={session ? <Profile /> : <Navigate to="/login" />} />
        <Route path="/profile/settings" element={session ? <ProfileSettings /> : <Navigate to="/login" />} />
        <Route path="/teams/:id" element={session ? <Team /> : <Navigate to="/login" />} />
        <Route path="/teams/:id/settings" element={session ? <TeamSettings /> : <Navigate to="/login" />} />
        <Route path="/teams/create" element={session ? <CreateTeam /> : <Navigate to="/login" />} />
        <Route path="/invites" element={session ? <TournamentInvites /> : <Navigate to="/login" />} />
        <Route path="/teams" element={session ? <Teams /> : <Navigate to="/login" />} />
        <Route path="/players" element={session ? <Players /> : <Navigate to="/login" />} />
        <Route path="/tournaments/:id/matches" element={session ? <TournamentMatchesPending /> : <Navigate to="/login" />} />

        {/* Default */}
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App