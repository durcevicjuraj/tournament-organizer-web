import type { Participant, Match as MatchType } from '../hooks/useTournament'

interface Props {
  matches: MatchType[]
  participants: Participant[]
}

function getParticipantName(id: string, participants: Participant[]) {
  const p = participants.find(p => p.id === id)
  return p?.teams?.name || p?.profiles?.username || 'TBD'
}

function MatchCard({ match, participants }: { match: MatchType, participants: Participant[] }) {
  const p1Name = getParticipantName(match.participant1_id, participants)
  const p2Name = getParticipantName(match.participant2_id, participants)

  return (
    <div className="flex flex-col w-40">
      <div className={`px-3 py-2 rounded-t border ${
        match.winner_id === match.participant1_id
          ? 'border-success bg-success/10 text-success font-bold'
          : 'border-base-content/20 bg-base-300'
      }`}>
        <div className="flex justify-between items-center">
          <span className="text-sm truncate">{p1Name}</span>
          {match.score1 !== null && <span className="text-sm ml-2">{match.score1}</span>}
        </div>
      </div>
      <div className={`px-3 py-2 rounded-b border-x border-b ${
        match.winner_id === match.participant2_id
          ? 'border-success bg-success/10 text-success font-bold'
          : 'border-base-content/20 bg-base-300'
      }`}>
        <div className="flex justify-between items-center">
          <span className="text-sm truncate">{p2Name}</span>
          {match.score2 !== null && <span className="text-sm ml-2">{match.score2}</span>}
        </div>
      </div>
    </div>
  )
}

const PHASE_ORDER = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final']

export default function KnockoutBracket({ matches, participants }: Props) {
  // Grupiraj mečeve po fazi
  const phases = PHASE_ORDER.filter(phase =>
    matches.some(m => m.phase === phase)
  )

  const matchesByPhase = phases.map(phase => ({
    phase,
    label: phase.replace(/_/g, ' ').toUpperCase(),
    matches: matches.filter(m => m.phase === phase)
  }))

  return (
    <div className="bg-base-200 rounded-xl p-6 overflow-x-auto">
      <div className="flex gap-8 items-center min-w-max">
        {matchesByPhase.map(({ phase, label, matches: phaseMatches }) => (
          <div key={phase} className="flex flex-col gap-4">
            <div className="text-center">
              <span className="badge badge-outline">{label}</span>
            </div>
            <div className="flex flex-col gap-6 justify-around h-full">
              {phaseMatches.map(match => (
                <MatchCard key={match.id} match={match} participants={participants} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}