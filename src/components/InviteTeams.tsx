import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Participant } from '../hooks/useTournament'

interface Team {
  id: string
  name: string
  country: string | null
}

interface Props {
  tournamentId: string
  gameId: string
  participants: Participant[]
  onInvited: () => void
}

const TEAMS_PER_PAGE = 10

export default function InviteTeams({ tournamentId, gameId, participants, onInvited }: Props) {
  const [teams, setTeams] = useState<Team[]>([])
  const [filtered, setFiltered] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [searchCountry, setSearchCountry] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, name, country')
        .eq('game_id', gameId)

      if (data) {
        setTeams(data)
        setFiltered(data)
      }
    }
    fetchTeams()
  }, [gameId])

  useEffect(() => {
    const result = teams.filter(t =>
      t.name.toLowerCase().includes(searchName.toLowerCase()) &&
      (t.country?.toLowerCase().includes(searchCountry.toLowerCase()) ?? searchCountry === '')
    ).sort((a, b) => {
      const aStatus = participants.find(p => p.teams?.id === a.id)?.status || null
      const bStatus = participants.find(p => p.teams?.id === b.id)?.status || null
      if (aStatus && !bStatus) return 1
      if (!aStatus && bStatus) return -1
      return 0
    })
    setFiltered(result)
    setPage(1)
  }, [searchName, searchCountry, teams, participants])

  const getParticipantStatus = (teamId: string) => {
    const participant = participants.find(p => p.teams?.id === teamId)
    return participant?.status || null
  }

  const handleInvite = async (teamId: string) => {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.rpc('invite_participant', {
      p_tournament_id: tournamentId,
      p_team_id: teamId,
      p_invited_by: user!.id
    })

    if (error) {
      setError(error.message)
    } else {
      onInvited()
    }

    setLoading(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return <span className="badge badge-success">Accepted</span>
      case 'declined': return <span className="badge badge-error">Declined</span>
      case 'invited': return <span className="badge badge-warning">Pending</span>
      case 'expired': return <span className="badge badge-ghost">Expired</span>
      default: return null
    }
  }

  const totalPages = Math.ceil(filtered.length / TEAMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * TEAMS_PER_PAGE, page * TEAMS_PER_PAGE)

  return (
    <div className="card bg-base-200">
      <div
        className="card-body cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex justify-between items-center">
          <h2 className="card-title">Invite Teams</h2>
          <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {isOpen && (
        <div className="px-6 pb-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>

          {error && <div className="alert alert-error"><span>{error}</span></div>}

          {/* Search */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="input input-bordered w-full"
            />
            <input
              type="text"
              placeholder="Search by country..."
              value={searchCountry}
              onChange={(e) => setSearchCountry(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>

          {/* Teams List */}
          {paginated.length === 0 ? (
            <p className="text-base-content/60 text-center py-4">No teams found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {paginated.map((team) => {
                const status = getParticipantStatus(team.id)
                return (
                  <div key={team.id} className="flex items-center justify-between bg-base-300 p-3 rounded-lg">
                    <div>
                      <span className="font-medium">{team.name}</span>
                      {team.country && (
                        <span className="text-base-content/60 text-sm ml-2">{team.country}</span>
                      )}
                    </div>
                    <div>
                      {status ? (
                        getStatusBadge(status)
                      ) : (
                        <button
                          onClick={() => handleInvite(team.id)}
                          disabled={loading}
                          className="btn btn-sm btn-primary"
                        >
                          Invite
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
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
      )}
    </div>
  )
}