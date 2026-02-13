import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTournament } from '../hooks/useTournament'

const PHASE_ORDER = ['group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final']

export default function TournamentMatchesPending() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tournament, participants, matches, loading, refetch } = useTournament(id!)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, { score1: string, score2: string }>>({})
  const [error, setError] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)

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
  const pendingMatches = matches.filter(m => m.status === 'pending')
  const completedMatches = matches.filter(m => m.status === 'completed')

  const getParticipantName = (participantId: string | null) => {
    if (!participantId) return 'TBD'
    const p = participants.find(p => p.id === participantId)
    return p?.teams?.name || p?.profiles?.username || 'TBD'
  }

  const getPhaseLabel = (phase: string) => {
    return phase.replace(/_/g, ' ').toUpperCase()
  }

  const isTBD = (match: any) => !match.participant1_id || !match.participant2_id

  const groupMatchesByPhase = (matchList: any[]) => {
    const grouped: Record<string, any[]> = {}
    matchList.forEach(m => {
      if (!grouped[m.phase]) grouped[m.phase] = []
      grouped[m.phase].push(m)
    })
    const sorted: Record<string, any[]> = {}
    PHASE_ORDER.forEach(phase => {
      if (grouped[phase]) sorted[phase] = grouped[phase]
    })
    return sorted
  }

  const handleScoreChange = (matchId: string, field: 'score1' | 'score2', value: string) => {
    setScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value }
    }))
  }

  const handleSubmit = async (matchId: string) => {
    const s1 = parseInt(scores[matchId]?.score1 || '0')
    const s2 = parseInt(scores[matchId]?.score2 || '0')

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      setError(prev => ({ ...prev, [matchId]: 'Scores must be valid positive numbers' }))
      return
    }

    if (s1 === s2) {
      setError(prev => ({ ...prev, [matchId]: 'Draw is not allowed' }))
      return
    }

    setSubmitting(matchId)
    setError(prev => ({ ...prev, [matchId]: '' }))

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.rpc('submit_match_result', {
      p_match_id: matchId,
      p_score1: s1,
      p_score2: s2,
      p_requested_by: user!.id
    })

    if (error) {
      setError(prev => ({ ...prev, [matchId]: error.message }))
    } else {
      setScores(prev => ({ ...prev, [matchId]: { score1: '', score2: '' } }))
      refetch()
    }

    setSubmitting(null)
  }

  const handleAdvanceToKnockout = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.rpc('advance_to_knockout', {
      p_tournament_id: tournament.id,
      p_requested_by: user!.id
    })
    if (error) alert(error.message)
    else refetch()
  }

  const allGroupMatchesCompleted = matches
    .filter(m => m.phase === 'group')
    .every(m => m.status === 'completed')

  const knockoutExists = matches.some(m => m.phase !== 'group')

  const groupedPending = groupMatchesByPhase(pendingMatches)
  const groupedCompleted = groupMatchesByPhase(completedMatches)

  return (
    <div className="max-w-4xl mx-auto p-8 flex flex-col gap-8">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Matches</h1>
          <p className="text-base-content/60 mt-1">{tournament.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/tournaments/${id}`)} className="btn btn-ghost btn-sm">
            ← Back
          </button>
          {isCreator && allGroupMatchesCompleted && !knockoutExists && (
            <button onClick={handleAdvanceToKnockout} className="btn btn-success">
              Advance to Knockout
            </button>
          )}
        </div>
      </div>

      {/* Pending Matches */}
      {isCreator && pendingMatches.length > 0 && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold">Pending Matches</h2>
          {Object.entries(groupedPending).map(([phase, phaseMatches]) => (
            <div key={phase} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-base-content/60 uppercase tracking-wider">
                {getPhaseLabel(phase)}
              </h3>
              {phaseMatches.map((match) => {
                const tbd = isTBD(match)
                return (
                  <div key={match.id} className={`card bg-base-200 ${tbd ? 'opacity-50' : ''}`}>
                    <div className="card-body">
                      {tbd && (
                        <div className="alert alert-warning py-2 mb-2">
                          <span className="text-sm">Waiting for previous round results</span>
                        </div>
                      )}

                      <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-4">
                          <span className="w-40 text-right font-medium">
                            {getParticipantName(match.participant1_id)}
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={scores[match.id]?.score1 ?? '0'}
                              onChange={(e) => handleScoreChange(match.id, 'score1', e.target.value)}
                              disabled={tbd}
                              className="input input-bordered w-16 text-center"
                            />
                            <span className="text-base-content/60">-</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={scores[match.id]?.score2 ?? '0'}
                              onChange={(e) => handleScoreChange(match.id, 'score2', e.target.value)}
                              disabled={tbd}
                              className="input input-bordered w-16 text-center"
                            />
                          </div>
                          <span className="w-40 font-medium">
                            {getParticipantName(match.participant2_id)}
                          </span>
                        </div>

                        {error[match.id] && (
                          <div className="alert alert-error py-2">
                            <span>{error[match.id]}</span>
                          </div>
                        )}

                        <button
                          onClick={() => handleSubmit(match.id)}
                          disabled={submitting === match.id || tbd}
                          className="btn btn-primary btn-sm"
                        >
                          {submitting === match.id ? <span className="loading loading-spinner loading-xs"></span> : 'Submit Result'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Completed Matches */}
      {completedMatches.length > 0 && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold">Completed Matches</h2>
          {Object.entries(groupedCompleted).map(([phase, phaseMatches]) => (
            <div key={phase} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-base-content/60 uppercase tracking-wider">
                {getPhaseLabel(phase)}
              </h3>
              {phaseMatches.map((match) => {
                const p1 = participants.find(p => p.id === match.participant1_id)
                const p2 = participants.find(p => p.id === match.participant2_id)
                return (
                  <div key={match.id} className="card bg-base-200 opacity-75">
                    <div className="card-body py-4">
                      <div className="grid grid-cols-3 items-center">
                        <span className={`text-right font-medium ${match.winner_id === match.participant1_id ? 'text-success font-bold' : 'text-base-content/60'}`}>
                          {p1?.teams?.name || p1?.profiles?.username}
                        </span>
                        <span className="text-center font-bold">
                          {match.score1} - {match.score2}
                        </span>
                        <span className={`font-medium ${match.winner_id === match.participant2_id ? 'text-success font-bold' : 'text-base-content/60'}`}>
                          {p2?.teams?.name || p2?.profiles?.username}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {pendingMatches.length === 0 && completedMatches.length === 0 && (
        <div className="hero bg-base-200 rounded-xl py-16">
          <div className="hero-content text-center">
            <p className="text-base-content/60">No matches yet.</p>
          </div>
        </div>
      )}

    </div>
  )
}