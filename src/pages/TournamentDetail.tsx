import { useParams, useNavigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTournament } from '../hooks/useTournament'
import KnockoutBracket from '../components/KnockoutBracket'
import InviteTeams from '../components/InviteTeams'

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tournament, participants, groups, standings, matches, loading, refetch } = useTournament(id!)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  )

  if (!tournament) return (
    <div className="p-8">
      <div className="alert alert-error"><span>Tournament not found</span></div>
    </div>
  )

  const isCreator = currentUserId === tournament.created_by
  const expectedParticipants = tournament.groups_count * tournament.participants_per_group
  const acceptedCount = participants.filter(p => p.status === 'accepted').length
  const allSpotsTaken = acceptedCount === expectedParticipants

  const handleStartTournament = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.rpc('start_tournament', {
      p_tournament_id: tournament.id,
      p_requested_by: user!.id
    })
    if (error) alert(error.message)
    else refetch()
  }

  const handleDeleteTournament = async () => {
    if (!confirm('Are you sure you want to delete this tournament?')) return
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournament.id)
    if (error) alert(error.message)
    else navigate('/dashboard')
  }

  return (
    <div className="max-w-5xl mx-auto p-8 flex flex-col gap-8">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{tournament.name}</h1>
          <p className="text-base-content/60 mt-1">
            {tournament.games?.name} · Created by {tournament.profiles?.username}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <span className="badge badge-lg">{tournament.current_phase}</span>
            <span className="badge badge-lg badge-primary">{tournament.status}</span>
          </div>
          <Link to={`/tournaments/${tournament.id}/matches`} className="btn btn-outline btn-sm">
              Matches
            </Link>
          {isCreator && tournament.status === 'draft' && allSpotsTaken && (
            <button onClick={handleStartTournament} className="btn btn-success">
              Start Tournament
            </button>
          )}
          {isCreator && (
            <button onClick={handleDeleteTournament} className="btn btn-error btn-sm">
              Delete Tournament
            </button>
          )}
        </div>
      </div>

      {/* Tournament Info */}
      <div className="stats bg-base-200 shadow">
        <div className="stat">
          <div className="stat-title">Groups</div>
          <div className="stat-value text-primary">{tournament.groups_count}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Per Group</div>
          <div className="stat-value">{tournament.participants_per_group}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Advancing</div>
          <div className="stat-value text-secondary">{tournament.advancing_per_group}</div>
          <div className="stat-desc">per group</div>
        </div>
        <div className="stat">
          <div className="stat-title">Participants</div>
          <div className="stat-value">{acceptedCount} / {expectedParticipants}</div>
          <div className="stat-desc">accepted</div>
        </div>
      </div>

      {/* Invite Teams - samo za creatora u draft statusu */}
      {isCreator && tournament.status === 'draft' && (
        <InviteTeams
          tournamentId={tournament.id}
          gameId={tournament.game_id}
          participants={participants}
          onInvited={refetch}
        />
      )}

      {/* Participants */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title mb-4">Participants</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Group</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const group = groups.find(g => g.id === p.group_id)
                  return (
                    <tr key={p.id}>
                      <td>{p.teams?.name || p.profiles?.username}</td>
                      <td>
                        <span className={`badge ${
                          p.status === 'accepted' ? 'badge-success' :
                          p.status === 'declined' ? 'badge-error' :
                          p.status === 'expired' ? 'badge-ghost' :
                          'badge-warning'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td>{group ? `Group ${group.group_name}` : '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Group Standings */}
      {groups.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold">Group Stage</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => {
              const groupStandings = standings.filter(s => s.group_id === group.id)
              const groupMatches = matches.filter(m => m.group_id === group.id)

              return (
                <div key={group.id} className="card bg-base-200">
                  <div className="card-body">
                    <h3 className="card-title">Group {group.group_name}</h3>

                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Team</th>
                          <th>W</th>
                          <th>L</th>
                          <th>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupStandings.map((s) => (
                          <tr key={s.id} className={s.position <= tournament.advancing_per_group ? 'text-success' : ''}>
                            <td>{s.position}</td>
                            <td>{s.tournament_participants?.teams?.name || s.tournament_participants?.profiles?.username}</td>
                            <td>{s.wins}</td>
                            <td>{s.losses}</td>
                            <td className="font-bold">{s.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="divider text-sm">Matches</div>
                    <div className="flex flex-col gap-2">
                      {groupMatches.map((match) => {
                        const p1 = participants.find(p => p.id === match.participant1_id)
                        const p2 = participants.find(p => p.id === match.participant2_id)
                        return (
                          <div key={match.id} className="flex items-center justify-between bg-base-300 p-2 rounded">
                            <span className={match.winner_id === match.participant1_id ? 'text-success font-bold' : ''}>
                              {p1?.teams?.name || p1?.profiles?.username}
                            </span>
                            <span className="text-base-content/60 text-sm">
                              {match.status === 'completed' ? `${match.score1} - ${match.score2}` : 'vs'}
                            </span>
                            <span className={match.winner_id === match.participant2_id ? 'text-success font-bold' : ''}>
                              {p2?.teams?.name || p2?.profiles?.username}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Knockout Stage */}
      {matches.filter(m => m.phase !== 'group').length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold">Knockout Stage</h2>
          <KnockoutBracket matches={matches.filter(m => m.phase !== 'group')} participants={participants} />
        </div>
      )}

    </div>
  )
}