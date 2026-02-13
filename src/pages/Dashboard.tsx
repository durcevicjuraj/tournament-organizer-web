import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

interface Tournament {
  id: string
  name: string
  status: string
  current_phase: string
  participant_type: string
  games: { name: string }
  profiles: { username: string }
}

export default function Dashboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, games(name), profiles(username)')
        .order('created_at', { ascending: false })

      if (!error && data) setTournaments(data)
      setLoading(false)
    }

    fetchTournaments()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'badge badge-success'
      case 'ongoing': return 'badge badge-primary'
      case 'registration': return 'badge badge-warning'
      default: return 'badge badge-ghost'
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tournaments</h1>
        <Link to="/tournaments/create" className="btn btn-primary">
          Create Tournament
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="hero bg-base-200 rounded-xl py-16">
          <div className="hero-content text-center">
            <div>
              <h2 className="text-xl font-semibold mb-2">No tournaments yet</h2>
              <p className="text-base-content/60 mb-6">Create your first tournament to get started</p>
              <Link to="/tournaments/create" className="btn btn-primary">
                Create Tournament
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              to={`/tournaments/${t.id}`}
              className="card bg-base-200 hover:bg-base-300 transition cursor-pointer"
            >
              <div className="card-body flex-row justify-between items-center">
                <div>
                  <h2 className="card-title">{t.name}</h2>
                  <p className="text-base-content/60 text-sm mt-1">
                    {t.games?.name} · Created by {t.profiles?.username}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className={getStatusBadge(t.status)}>{t.status}</span>
                    <span className="badge badge-outline">{t.participant_type}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}