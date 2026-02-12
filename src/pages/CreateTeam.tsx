import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

interface Game {
  id: string
  name: string
}

export default function CreateTeam() {
  const navigate = useNavigate()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [gameId, setGameId] = useState('')
  const [country, setCountry] = useState('')

  useEffect(() => {
    const fetchGames = async () => {
      const { data } = await supabase.from('games').select('*')
      if (data) {
        setGames(data)
        setGameId(data[0]?.id || '')
      }
    }
    fetchGames()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.rpc('create_team', {
      p_name: name,
      p_game_id: gameId,
      p_created_by: user!.id,
      p_country: country || null
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Create Team</h1>

      {error && <div className="alert alert-error mb-6"><span>{error}</span></div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <label className="form-control">
          <div className="label"><span className="label-text">Team Name</span></div>
          <input
            type="text"
            placeholder="My Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input input-bordered w-full"
            required
          />
        </label>

        <label className="form-control">
          <div className="label"><span className="label-text">Game</span></div>
          <select
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="select select-bordered w-full"
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <div className="label"><span className="label-text">Country (optional)</span></div>
          <input
            type="text"
            placeholder="Croatia"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="input input-bordered w-full"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? <span className="loading loading-spinner"></span> : 'Create Team'}
        </button>
      </form>
    </div>
  )
}