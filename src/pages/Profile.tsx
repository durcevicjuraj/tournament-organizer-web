import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useParams } from 'react-router-dom'

interface Profile {
  id: string
  username: string
  country: string | null
  avatar_url: string | null
  created_at: string
}

interface Game {
  id: string
  name: string
}

interface Team {
  id: string
  name: string
  country: string | null
  created_by: string
  games: { id: string; name: string }
  isOwner: boolean
  isMember: boolean
}

const TEAMS_PER_PAGE = 10

export default function Profile() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [allGames, setAllGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  const [searchName, setSearchName] = useState('')
  const [searchGame, setSearchGame] = useState('')
  const [roleFilter, setRoleFilter] = useState<'both' | 'owner' | 'player'>('both')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchData = async () => {
      const [profileData, playerGames, ownedTeams, memberTeams, gamesData] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('player_games')
          .select('games(id, name)')
          .eq('player_id', id),
        supabase
          .from('teams')
          .select('*, games(id, name)')
          .eq('created_by', id),
        supabase
          .from('team_members')
          .select('teams(*, games(id, name))')
          .eq('player_id', id),
        supabase
          .from('games')
          .select('id, name')
          .order('name')
      ])

      if (profileData.data) setProfile(profileData.data)

      if (playerGames.data) {
        const g = playerGames.data.map((pg: any) => pg.games).filter(Boolean)
        setGames(g)
      }

      if (gamesData.data) setAllGames(gamesData.data)

      const owned: Team[] = (ownedTeams.data || []).map((t: any) => ({
        ...t,
        isOwner: true,
        isMember: false
      }))

      const memberTeamIds = new Set(owned.map(t => t.id))

      const members: Team[] = (memberTeams.data || [])
        .map((m: any) => m.teams)
        .filter(Boolean)
        .filter((t: any) => !memberTeamIds.has(t.id))
        .map((t: any) => ({
          ...t,
          isOwner: false,
          isMember: true
        }))

      setTeams([...owned, ...members])
      setLoading(false)
    }

    fetchData()
  }, [id])

  const filtered = teams.filter(t => {
    const nameMatch = t.name.toLowerCase().includes(searchName.toLowerCase())
    const gameMatch = searchGame === '' || t.games?.id === searchGame
    const roleMatch =
      roleFilter === 'both' ||
      (roleFilter === 'owner' && t.isOwner) ||
      (roleFilter === 'player' && t.isMember)
    return nameMatch && gameMatch && roleMatch
  })

  const totalPages = Math.ceil(filtered.length / TEAMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * TEAMS_PER_PAGE, page * TEAMS_PER_PAGE)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  )

  if (!profile) return (
    <div className="p-8">
      <div className="alert alert-error"><span>Profile not found</span></div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-8 flex flex-col gap-8">

      {/* Profile Header */}
      <div className="card bg-base-200">
        <div className="card-body">
          <div className="flex items-center gap-6">
            <div className="avatar">
              <div className="rounded-full w-20 overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="bg-neutral text-neutral-content rounded-full w-20 h-20 flex items-center justify-center">
                    <span className="text-3xl">{profile.username.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{profile.username}</h1>
              {profile.country && (
                <p className="text-base-content/60 mt-1">{profile.country}</p>
              )}
              <p className="text-base-content/40 text-sm mt-1">
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Games */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title mb-4">Games</h2>
          {games.length === 0 ? (
            <p className="text-base-content/60">No games added yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {games.map(g => (
                <span key={g.id} className="badge badge-primary badge-lg">{g.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="card bg-base-200">
        <div className="card-body flex flex-col gap-4">
          <h2 className="card-title">Teams</h2>

          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => { setSearchName(e.target.value); setPage(1) }}
              className="input input-bordered flex-1"
            />
            <select
              value={searchGame}
              onChange={(e) => { setSearchGame(e.target.value); setPage(1) }}
              className="select select-bordered w-48"
            >
              <option value="">All Games</option>
              {allGames.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value as 'both' | 'owner' | 'player'); setPage(1) }}
              className="select select-bordered w-40"
            >
              <option value="both">Both</option>
              <option value="owner">Owner</option>
              <option value="player">Player</option>
            </select>
          </div>

          {/* Teams List */}
          {paginated.length === 0 ? (
            <p className="text-base-content/60 text-center py-4">No teams found.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {paginated.map(team => (
                <div key={team.id} className="flex items-center justify-between bg-base-300 p-3 rounded-lg">
                  <div>
                    <span className="font-medium">{team.name}</span>
                    <p className="text-base-content/60 text-sm">
                      {team.games?.name}
                      {team.country && ` · ${team.country}`}
                    </p>
                  </div>
                  <span className={`badge ${team.isOwner ? 'badge-primary' : 'badge-secondary'}`}>
                    {team.isOwner ? 'Owner' : 'Player'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-sm btn-ghost"
              >
                «
              </button>
              <span className="flex items-center text-sm text-base-content/60">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-sm btn-ghost"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}