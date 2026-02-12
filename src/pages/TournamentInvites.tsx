import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

interface TournamentInvite {
  id: string
  status: string
  invited_at: string
  responded_at: string | null
  tournaments: {
    id: string
    name: string
    status: string
    games: { name: string }
    profiles: { username: string }
  }
  teams: {
    id: string
    name: string
  }
}

interface TeamInvite {
  id: string
  status: string
  created_at: string
  responded_at: string | null
  teams: {
    id: string
    name: string
    logo_url: string | null
    games: { name: string }
    profiles: { username: string }
  }
}

export default function TournamentInvites() {
  const [tournamentInvites, setTournamentInvites] = useState<TournamentInvite[]>([])
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [tab, setTab] = useState<'tournament' | 'team'>('tournament')

  const fetchInvites = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Tournament invites - za timove koje user posjeduje
    const { data: userTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('created_by', user.id)

    if (userTeams && userTeams.length > 0) {
      const teamIds = userTeams.map(t => t.id)
      const { data } = await supabase
        .from('tournament_participants')
        .select(`
          id, status, invited_at, responded_at,
          tournaments(id, name, status, games(name), profiles(username)),
          teams(id, name)
        `)
        .in('team_id', teamIds)
        .order('invited_at', { ascending: false })

      if (data) setTournamentInvites(data as any)
    }

    // Team invites - za usera osobno
    const { data: teamInviteData } = await supabase
      .from('team_invites')
      .select(`
        id, status, created_at, responded_at,
        teams(id, name, logo_url, games(name), profiles:created_by(username))
      `)
      .eq('player_id', user.id)
      .order('created_at', { ascending: false })

    if (teamInviteData) setTeamInvites(teamInviteData as any)

    setLoading(false)
  }

  useEffect(() => {
    fetchInvites()
  }, [])

  const handleTournamentRespond = async (inviteId: string, teamId: string, tournamentId: string, accept: boolean) => {
    setActionLoading(inviteId)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.rpc('respond_to_invite', {
      p_tournament_id: tournamentId,
      p_team_id: teamId,
      p_responded_by: user!.id,
      p_accept: accept
    })

    if (error) setError(error.message)
    else fetchInvites()

    setActionLoading(null)
  }

  const handleTeamRespond = async (inviteId: string, accept: boolean) => {
    setActionLoading(inviteId)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.rpc('respond_to_team_invite', {
      p_invite_id: inviteId,
      p_player_id: user!.id,
      p_accept: accept
    })

    if (error) setError(error.message)
    else fetchInvites()

    setActionLoading(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return 'badge-success'
      case 'declined': return 'badge-error'
      case 'invited':
      case 'pending': return 'badge-warning'
      default: return 'badge-ghost'
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  )

  const activeTournamentInvites = tournamentInvites.filter(i => i.status === 'invited')
  const pastTournamentInvites = tournamentInvites.filter(i => i.status !== 'invited')
  const activeTeamInvites = teamInvites.filter(i => i.status === 'pending')
  const pastTeamInvites = teamInvites.filter(i => i.status !== 'pending')

  return (
    <div className="max-w-3xl mx-auto p-8 flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Invites</h1>

      {error && <div className="alert alert-error"><span>{error}</span></div>}

      {/* Tabs */}
      <div className="tabs tabs-boxed">
        <button
          className={`tab ${tab === 'tournament' ? 'tab-active' : ''}`}
          onClick={() => setTab('tournament')}
        >
          Tournament Invites
          {activeTournamentInvites.length > 0 && (
            <span className="badge badge-warning badge-sm ml-2">{activeTournamentInvites.length}</span>
          )}
        </button>
        <button
          className={`tab ${tab === 'team' ? 'tab-active' : ''}`}
          onClick={() => setTab('team')}
        >
          Team Invites
          {activeTeamInvites.length > 0 && (
            <span className="badge badge-warning badge-sm ml-2">{activeTeamInvites.length}</span>
          )}
        </button>
      </div>

      {/* Tournament Invites */}
      {tab === 'tournament' && (
        <div className="flex flex-col gap-4">
          <p className="text-base-content/60 text-sm">Invites sent to your teams</p>

          {activeTournamentInvites.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body">
                <p className="text-base-content/60">No pending tournament invites.</p>
              </div>
            </div>
          ) : (
            activeTournamentInvites.map((invite) => (
              <div key={invite.id} className="card bg-base-200">
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <Link to={`/tournaments/${invite.tournaments.id}`} className="text-lg font-semibold link link-hover">
                        {invite.tournaments.name}
                      </Link>
                      <p className="text-base-content/60 text-sm">
                        {invite.tournaments.games.name} · Created by {invite.tournaments.profiles.username}
                      </p>
                      <p className="text-base-content/60 text-sm">
                        Team: <span className="text-base-content">{invite.teams.name}</span>
                      </p>
                      <p className="text-base-content/60 text-xs mt-1">
                        Invited: {new Date(invite.invited_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTournamentRespond(invite.id, invite.teams.id, invite.tournaments.id, true)}
                        disabled={actionLoading === invite.id}
                        className="btn btn-success btn-sm"
                      >
                        {actionLoading === invite.id ? <span className="loading loading-spinner loading-xs"></span> : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleTournamentRespond(invite.id, invite.teams.id, invite.tournaments.id, false)}
                        disabled={actionLoading === invite.id}
                        className="btn btn-error btn-sm"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {pastTournamentInvites.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-base-content/60">Past</h3>
              {pastTournamentInvites.map((invite) => (
                <div key={invite.id} className="card bg-base-200 opacity-50">
                  <div className="card-body py-3">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-1">
                        <Link to={`/tournaments/${invite.tournaments.id}`} className="font-semibold link link-hover">
                          {invite.tournaments.name}
                        </Link>
                        <p className="text-base-content/60 text-sm">
                          {invite.tournaments.games.name} · Team: {invite.teams.name}
                        </p>
                        <p className="text-base-content/60 text-xs">
                          Invited: {new Date(invite.invited_at).toLocaleDateString()}
                          {invite.responded_at && ` · Responded: ${new Date(invite.responded_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <span className={`badge ${getStatusBadge(invite.status)}`}>
                        {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team Invites */}
      {tab === 'team' && (
        <div className="flex flex-col gap-4">
          <p className="text-base-content/60 text-sm">Invites to join a team</p>

          {activeTeamInvites.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body">
                <p className="text-base-content/60">No pending team invites.</p>
              </div>
            </div>
          ) : (
            activeTeamInvites.map((invite) => (
              <div key={invite.id} className="card bg-base-200">
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <Link to={`/teams/${invite.teams.id}`} className="text-lg font-semibold link link-hover">
                        {invite.teams.name}
                      </Link>
                      <p className="text-base-content/60 text-sm">
                        {invite.teams.games?.name} · Owner: {invite.teams.profiles?.username}
                      </p>
                      <p className="text-base-content/60 text-xs mt-1">
                        Invited: {new Date(invite.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTeamRespond(invite.id, true)}
                        disabled={actionLoading === invite.id}
                        className="btn btn-success btn-sm"
                      >
                        {actionLoading === invite.id ? <span className="loading loading-spinner loading-xs"></span> : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleTeamRespond(invite.id, false)}
                        disabled={actionLoading === invite.id}
                        className="btn btn-error btn-sm"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {pastTeamInvites.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-base-content/60">Past</h3>
              {pastTeamInvites.map((invite) => (
                <div key={invite.id} className="card bg-base-200 opacity-50">
                  <div className="card-body py-3">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-1">
                        <Link to={`/teams/${invite.teams.id}`} className="font-semibold link link-hover">
                          {invite.teams.name}
                        </Link>
                        <p className="text-base-content/60 text-sm">
                          {invite.teams.games?.name} · Owner: {invite.teams.profiles?.username}
                        </p>
                        <p className="text-base-content/60 text-xs">
                          Invited: {new Date(invite.created_at).toLocaleDateString()}
                          {invite.responded_at && ` · Responded: ${new Date(invite.responded_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <span className={`badge ${getStatusBadge(invite.status)}`}>
                        {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}