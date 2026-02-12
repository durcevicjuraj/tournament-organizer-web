import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

interface Game {
  id: string
  name: string
}

export default function CreateTournament() {
  const navigate = useNavigate()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [gameId, setGameId] = useState('')
  const [participantType, setParticipantType] = useState('team')
  const [groupsCount, setGroupsCount] = useState(2)
  const [participantsPerGroup, setParticipantsPerGroup] = useState(2)
  const [advancingPerGroup, setAdvancingPerGroup] = useState(1)

  const totalAdvancing = groupsCount * advancingPerGroup
  const isPowerOf2 = (n: number) => n > 0 && (n & (n - 1)) === 0
  const isEven = (n: number) => n % 2 === 0

  const isValid =
    isPowerOf2(totalAdvancing) &&
    isEven(groupsCount) &&
    advancingPerGroup < participantsPerGroup

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
    if (!isValid) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc('create_tournament', {
      p_name: name,
      p_game_id: gameId,
      p_created_by: user!.id,
      p_participant_type: participantType,
      p_groups_count: groupsCount,
      p_participants_per_group: participantsPerGroup,
      p_advancing_per_group: advancingPerGroup
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate(`/tournaments/${data.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Create Tournament</h1>

      {error && <div className="alert alert-error mb-6"><span>{error}</span></div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        <label className="form-control">
          <div className="label"><span className="label-text">Tournament Name</span></div>
          <input
            type="text"
            placeholder="My Tournament"
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
          <div className="label"><span className="label-text">Participant Type</span></div>
          <select
            value={participantType}
            onChange={(e) => setParticipantType(e.target.value)}
            className="select select-bordered w-full"
          >
            <option value="team">Teams</option>
            <option value="player">Players</option>
          </select>
        </label>

        <div className="grid grid-cols-3 gap-4">
          <label className="form-control">
            <div className="label"><span className="label-text">Groups</span></div>
            <input
              type="number"
              value={groupsCount}
              onChange={(e) => setGroupsCount(Number(e.target.value))}
              min={2}
              className="input input-bordered w-full"
            />
            {!isEven(groupsCount) && (
              <div className="label"><span className="label-text-alt text-error">Must be even</span></div>
            )}
          </label>

          <label className="form-control">
            <div className="label"><span className="label-text">Per Group</span></div>
            <input
              type="number"
              value={participantsPerGroup}
              onChange={(e) => setParticipantsPerGroup(Number(e.target.value))}
              min={2}
              max={10}
              className="input input-bordered w-full"
            />
          </label>

          <label className="form-control">
            <div className="label"><span className="label-text">Advancing</span></div>
            <input
              type="number"
              value={advancingPerGroup}
              onChange={(e) => setAdvancingPerGroup(Number(e.target.value))}
              min={1}
              className="input input-bordered w-full"
            />
          </label>
        </div>

        {!isPowerOf2(totalAdvancing) && (
          <div className="alert alert-warning">
            <span>Total advancing ({totalAdvancing}) must be 4, 8, 16, 32...</span>
          </div>
        )}

        <div className="stats bg-base-200 shadow">
          <div className="stat">
            <div className="stat-title">Total Participants</div>
            <div className="stat-value text-primary">{groupsCount * participantsPerGroup}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Knockout Stage</div>
            <div className="stat-value text-secondary">{totalAdvancing}</div>
            <div className="stat-desc">teams advancing</div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!isValid || loading}
          className="btn btn-primary w-full"
        >
          {loading ? <span className="loading loading-spinner"></span> : 'Create Tournament'}
        </button>

      </form>
    </div>
  )
}