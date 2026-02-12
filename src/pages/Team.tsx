import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useParams, Link, useNavigate } from 'react-router-dom'

interface Team {
  id: string
  name: string
  country: string | null
  logo_url: string | null
  created_by: string
  created_at: string
  games: { id: string; name: string }
}

interface Member {
  id: string
  role: string
  profiles: {
    id: string
    username: string
    avatar_url: string | null
  }
}

export default function Team() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [owner, setOwner] = useState<{ id: string; username: string; avatar_url: string | null } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      const [teamData, membersData] = await Promise.all([
        supabase
          .from('teams')
          .select('*, games(id, name)')
          .eq('id', id)
          .single(),
        supabase
          .from('team_members')
          .select('id, role, profiles(id, username, avatar_url)')
          .eq('team_id', id)
      ])

      if (teamData.data) {
        setTeam(teamData.data)

        const { data: ownerData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', teamData.data.created_by)
          .single()

        if (ownerData) setOwner(ownerData)
      }

      if (membersData.data) setMembers(membersData.data as any)

      setLoading(false)
    }

    fetchData()
  }, [id])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this team?')) return
    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (error) alert(error.message)
    else navigate('/teams')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  )

  if (!team) return (
    <div className="p-8">
      <div className="alert alert-error"><span>Team not found</span></div>
    </div>
  )

  const isOwner = currentUserId === team.created_by

  return (
    <div className="max-w-4xl mx-auto p-8 flex flex-col gap-8">

      {/* Team Header */}
      <div className="card bg-base-200">
        <div className="card-body">
          <div className="flex items-center gap-6">
            <div className="avatar">
              <div className="rounded-xl w-24 overflow-hidden">
                {team.logo_url ? (
                  <img src={team.logo_url} alt="Team Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="bg-neutral text-neutral-content w-24 h-24 flex items-center justify-center rounded-xl">
                    <span className="text-4xl">{team.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{team.name}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="badge badge-primary badge-lg">{team.games?.name}</span>
                {team.country && (
                  <span className="badge badge-outline badge-lg">{team.country}</span>
                )}
              </div>
              <p className="text-base-content/40 text-sm mt-2">
                Created {new Date(team.created_at).toLocaleDateString()}
              </p>
            </div>
            {isOwner && (
              <div className="flex gap-2">
                <Link to={`/teams/${id}/settings`} className="btn btn-outline btn-sm">
                  Edit
                </Link>
                <button onClick={handleDelete} className="btn btn-error btn-sm">
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Owner */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title mb-4">Owner</h2>
          {owner && (
            <Link
              to={`/profile/${owner.id}`}
              className="flex items-center gap-4 bg-base-300 p-3 rounded-lg hover:bg-base-300/80 transition"
            >
              <div className="avatar">
                <div className="rounded-full w-10 overflow-hidden">
                  {owner.avatar_url ? (
                    <img src={owner.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="bg-neutral text-neutral-content rounded-full w-10 h-10 flex items-center justify-center">
                      <span>{owner.username.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>
              <span className="font-medium">{owner.username}</span>
              <span className="badge badge-primary ml-auto">Owner</span>
            </Link>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title mb-4">Members ({members.length})</h2>
          {members.length === 0 ? (
            <p className="text-base-content/60">No members yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {members.map(member => (
                <Link
                  key={member.id}
                  to={`/profile/${member.profiles.id}`}
                  className="flex items-center gap-4 bg-base-300 p-3 rounded-lg hover:bg-base-300/80 transition"
                >
                  <div className="avatar">
                    <div className="rounded-full w-10 overflow-hidden">
                      {member.profiles.avatar_url ? (
                        <img src={member.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="bg-neutral text-neutral-content rounded-full w-10 h-10 flex items-center justify-center">
                          <span>{member.profiles.username.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="font-medium">{member.profiles.username}</span>
                  <span className={`badge ml-auto ${member.role === 'captain' ? 'badge-secondary' : 'badge-ghost'}`}>
                    {member.role}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}