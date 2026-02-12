import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface Tournament {
  id: string
  name: string
  game_id: string
  status: string
  current_phase: string
  participant_type: string
  groups_count: number
  participants_per_group: number
  advancing_per_group: number
  created_by: string
  games: { name: string }
  profiles: { username: string }
}

export interface Participant {
  id: string
  status: string
  group_id: string | null
  teams: { id: string; name: string } | null
  profiles: { id: string; username: string } | null
}

export interface Group {
  id: string
  group_name: string
  group_order: number
}

export interface Standing {
  id: string
  group_id: string
  participant_id: string
  played: number
  wins: number
  losses: number
  points: number
  position: number
  tournament_participants: {
    teams: { name: string } | null
    profiles: { username: string } | null
  }
}

export interface Match {
  id: string
  phase: string
  round_number: number
  match_number: number
  group_id: string | null
  next_match_id: string | null
  status: string
  score1: number | null
  score2: number | null
  participant1_id: string
  participant2_id: string
  winner_id: string | null
}

export function useTournament(id: string) {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    const [t, p, g, s, m] = await Promise.all([
      supabase.from('tournaments').select('*, games(name), profiles(username)').eq('id', id).single(),
      supabase.from('tournament_participants').select('*, teams(id, name), profiles(id, username)').eq('tournament_id', id),
      supabase.from('tournament_groups').select('*').eq('tournament_id', id).order('group_order'),
      supabase.from('group_standings').select('*, tournament_participants(teams(name), profiles(username))').eq('tournament_id', id).order('position'),
      supabase.from('matches').select('*').eq('tournament_id', id).order('round_number')
    ])

    if (t.data) setTournament(t.data)
    if (p.data) setParticipants(p.data)
    if (g.data) setGroups(g.data)
    if (s.data) setStandings(s.data)
    if (m.data) setMatches(m.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [id])

  return { tournament, participants, groups, standings, matches, loading, refetch: fetchAll }
}