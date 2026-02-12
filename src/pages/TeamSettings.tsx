import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getData } from 'country-list'

interface Team {
  id: string
  name: string
  country: string | null
  logo_url: string | null
  created_by: string
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

interface PendingInvite {
  id: string
  profiles: {
    id: string
    username: string
    avatar_url: string | null
  }
}

interface Player {
  id: string
  username: string
  avatar_url: string | null
  country: string | null
  games: { id: string; name: string }[]
}

interface Game {
  id: string
  name: string
}

const countries = getData().sort((a, b) => a.name.localeCompare(b.name))

export default function TeamSettings() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const countryDropdownRef = useRef<HTMLDivElement>(null)
  const inviteCountryDropdownRef = useRef<HTMLDivElement>(null)

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [allGames, setAllGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')

  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)

  const [playerSearch, setPlayerSearch] = useState('')
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [inviteCountrySearch, setInviteCountrySearch] = useState('')
  const [inviteCountryDropdownOpen, setInviteCountryDropdownOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inviteCountryDropdownRef.current && !inviteCountryDropdownRef.current.contains(e.target as Node)) {
        setInviteCountryDropdownOpen(false)
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)

    const [teamData, membersData, invitesData, playersData, gamesData] = await Promise.all([
      supabase.from('teams').select('*, games(id, name)').eq('id', id).single(),
      supabase.from('team_members').select('id, role, profiles(id, username, avatar_url)').eq('team_id', id),
      supabase.from('team_invites').select('id, profiles(id, username, avatar_url)').eq('team_id', id).eq('status', 'pending'),
      supabase.from('profiles').select('id, username, avatar_url, country, player_games(games(id, name))').order('username'),
      supabase.from('games').select('id, name').order('name')
    ])

    if (teamData.data) {
      if (teamData.data.created_by !== user?.id) {
        navigate(`/teams/${id}`)
        return
      }
      setTeam(teamData.data)
      setName(teamData.data.name)
      setCountry(teamData.data.country || '')
      setLogoUrl(teamData.data.logo_url || '')
      setCountrySearch(teamData.data.country || '')
    }

    if (membersData.data) setMembers(membersData.data as any)
    if (invitesData.data) setPendingInvites(invitesData.data as any)
    if (gamesData.data) setAllGames(gamesData.data)
    if (playersData.data) {
      const mapped = playersData.data.map((p: any) => ({
        id: p.id,
        username: p.username,
        avatar_url: p.avatar_url,
        country: p.country,
        games: (p.player_games || []).map((pg: any) => pg.games).filter(Boolean)
      }))
      setAllPlayers(mapped)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const getFilteredPlayers = () => {
    const memberIds = new Set(members.map(m => m.profiles.id))
    const excludeIds = new Set([team?.created_by || ''])

    return allPlayers.filter(p => {
      if (excludeIds.has(p.id)) return false
      if (memberIds.has(p.id)) return false
      const nameMatch = p.username.toLowerCase().includes(playerSearch.toLowerCase())
      const countryMatch = selectedCountries.length === 0 || (p.country !== null && selectedCountries.includes(p.country))
      const gameMatch = selectedGame === '' || p.games.some(g => g.id === selectedGame)
      return nameMatch && countryMatch && gameMatch
    }).slice(0, 10)
  }

  const filteredPlayers = getFilteredPlayers()

  const toggleInviteCountry = (name: string) => {
    setSelectedCountries(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    )
  }

  const filteredInviteCountries = countries.filter(c =>
    c.name.toLowerCase().includes(inviteCountrySearch.toLowerCase())
  )

  const handleToggleSelfMembership = async () => {
    const isMember = members.some(m => m.profiles.id === currentUserId)
    if (isMember) {
      const member = members.find(m => m.profiles.id === currentUserId)
      if (!member) return
      const { error } = await supabase.from('team_members').delete().eq('id', member.id)
      if (error) setError(error.message)
      else fetchData()
    } else {
      const { error } = await supabase.from('team_members').insert({
        team_id: id,
        player_id: currentUserId,
        role: 'member'
      })
      if (error) setError(error.message)
      else fetchData()
    }
  }

  const handleInvitePlayer = async (playerId: string) => {
    setInviteLoading(true)
    setInviteError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.rpc('invite_player_to_team', {
      p_team_id: id,
      p_player_id: playerId,
      p_invited_by: user!.id
    })

    if (error) setInviteError(error.message)
    else fetchData()

    setInviteLoading(false)
  }

  const handleCancelInvite = async (inviteId: string) => {
    const { error } = await supabase.from('team_invites').delete().eq('id', inviteId)
    if (error) setError(error.message)
    else fetchData()
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be smaller than 2MB'); return }

    setUploading(true)
    setError('')

    const fileExt = file.name.split('.').pop()
    const filePath = `${id}/logo.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('team-logos').upload(filePath, file, { upsert: true })

    if (uploadError) { setError(uploadError.message); setUploading(false); return }

    const { data } = supabase.storage.from('team-logos').getPublicUrl(filePath)
    setLogoUrl(data.publicUrl)
    setUploading(false)
  }

  const handleCountrySelect = (countryName: string) => {
    setCountry(countryName)
    setCountrySearch(countryName)
    setCountryDropdownOpen(false)
  }

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    const { error } = await supabase.from('team_members').delete().eq('id', memberId)
    if (error) setError(error.message)
    else setMembers(prev => prev.filter(m => m.id !== memberId))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    const { error } = await supabase
      .from('teams')
      .update({ name, country: country || null, logo_url: logoUrl || null })
      .eq('id', id)

    if (error) setError(error.message)
    else setSuccess(true)

    setSaving(false)
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

  const isOwnerMember = members.some(m => m.profiles.id === currentUserId)

  return (
    <div className="max-w-2xl mx-auto p-8 flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Team Settings</h1>
        <button onClick={() => navigate(`/teams/${id}`)} className="btn btn-ghost btn-sm">
          ← Back to Team
        </button>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}
      {success && <div className="alert alert-success"><span>Team updated successfully!</span></div>}

      {/* Owner membership */}
      <div className="card bg-base-200">
        <div className="card-body flex-row items-center justify-between">
          <div>
            <h2 className="font-semibold">Your membership</h2>
            <p className="text-base-content/60 text-sm">
              {isOwnerMember
                ? 'You are currently a member of this team'
                : 'You are not a member of this team'}
            </p>
          </div>
          <button
            onClick={handleToggleSelfMembership}
            className={`btn btn-sm ${isOwnerMember ? 'btn-error' : 'btn-success'}`}
          >
            {isOwnerMember ? 'Leave Team' : 'Join Team'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">

        {/* Logo */}
        <div className="form-control">
          <div className="label"><span className="label-text">Team Logo</span></div>
          <div className="flex items-center gap-6">
            <div className="avatar">
              <div className="rounded-xl w-20 overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="bg-neutral text-neutral-content w-20 h-20 flex items-center justify-center rounded-xl">
                    <span className="text-3xl">{name?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn btn-outline btn-sm">
                {uploading ? <span className="loading loading-spinner loading-xs"></span> : 'Upload Logo'}
              </button>
              {logoUrl && (
                <button type="button" onClick={() => setLogoUrl('')} className="btn btn-ghost btn-sm text-error">Remove</button>
              )}
              <span className="text-base-content/40 text-xs">Max 2MB, image files only</span>
            </div>
          </div>
        </div>

        {/* Name */}
        <label className="form-control">
          <div className="label"><span className="label-text">Team Name</span></div>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input input-bordered w-full" required />
        </label>

        {/* Country */}
        <div className="form-control">
          <div className="label"><span className="label-text">Country (optional)</span></div>
          <div className="relative" ref={countryDropdownRef}>
            <input
              type="text"
              value={countrySearch}
              onChange={(e) => { setCountrySearch(e.target.value); setCountry(''); setCountryDropdownOpen(true) }}
              onFocus={() => setCountryDropdownOpen(true)}
              placeholder="Search country..."
              className="input input-bordered w-full"
            />
            {countryDropdownOpen && countrySearch && (
              <div className="absolute z-50 w-full bg-base-200 border border-base-300 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                {filteredCountries.length === 0 ? (
                  <div className="p-3 text-base-content/60 text-sm">No countries found</div>
                ) : (
                  filteredCountries.map(c => (
                    <div key={c.code} onClick={() => handleCountrySelect(c.name)} className="p-3 hover:bg-base-300 cursor-pointer text-sm">
                      {c.name}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {country && (
            <div className="label">
              <span className="label-text-alt text-success">Selected: {country}</span>
              <span className="label-text-alt text-error cursor-pointer" onClick={() => { setCountry(''); setCountrySearch('') }}>Clear</span>
            </div>
          )}
        </div>

        <button type="submit" disabled={saving || uploading} className="btn btn-primary w-full">
          {saving ? <span className="loading loading-spinner"></span> : 'Save Changes'}
        </button>
      </form>

      {/* Invite Players */}
      <div className="card bg-base-200">
        <div className="card-body flex flex-col gap-4">
          <h2 className="card-title">Invite Players</h2>

          {inviteError && <div className="alert alert-error"><span>{inviteError}</span></div>}

          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Search by username..."
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              className="input input-bordered w-full"
            />

            <div className="flex gap-3">
              <div className="relative flex-1" ref={inviteCountryDropdownRef}>
                <div
                  className="input input-bordered w-full flex items-center justify-between cursor-pointer"
                  onClick={() => setInviteCountryDropdownOpen(!inviteCountryDropdownOpen)}
                >
                  <span className={selectedCountries.length === 0 ? 'text-base-content/40' : ''}>
                    {selectedCountries.length === 0 ? 'Filter by country...' : `${selectedCountries.length} selected`}
                  </span>
                  <span className={`transition-transform duration-200 ${inviteCountryDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                </div>
                {inviteCountryDropdownOpen && (
                  <div className="absolute z-50 w-full bg-base-200 border border-base-300 rounded-lg mt-1 shadow-lg">
                    <div className="p-2">
                      <input
                        type="text"
                        placeholder="Search countries..."
                        value={inviteCountrySearch}
                        onChange={(e) => setInviteCountrySearch(e.target.value)}
                        className="input input-bordered input-sm w-full"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {selectedCountries.length > 0 && (
                      <div className="px-2 pb-1">
                        <button onClick={() => setSelectedCountries([])} className="btn btn-ghost btn-xs text-error">Clear all</button>
                      </div>
                    )}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredInviteCountries.map(c => (
                        <label
                          key={c.code}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-base-300 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCountries.includes(c.name)}
                            onChange={() => toggleInviteCountry(c.name)}
                            className="checkbox checkbox-primary checkbox-sm"
                          />
                          <span className="text-sm">{c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="select select-bordered w-48"
              >
                <option value="">All Games</option>
                {allGames.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {selectedCountries.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedCountries.map(c => (
                  <span key={c} className="badge badge-primary gap-1 cursor-pointer" onClick={() => toggleInviteCountry(c)}>
                    {c} ✕
                  </span>
                ))}
              </div>
            )}
          </div>

          {filteredPlayers.length === 0 ? (
            <p className="text-base-content/60 text-center py-2">No players found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredPlayers.map(player => {
                const isPending = pendingInvites.some(i => i.profiles.id === player.id)
                return (
                  <div key={player.id} className="flex items-center gap-3 bg-base-300 p-3 rounded-lg">
                    <div className="avatar">
                      <div className="rounded-full w-8 overflow-hidden">
                        {player.avatar_url ? (
                          <img src={player.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center">
                            <span className="text-xs">{player.username.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{player.username}</p>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {player.games.map(g => (
                          <span key={g.id} className="badge badge-primary badge-xs">{g.name}</span>
                        ))}
                      </div>
                    </div>
                    {player.country && <span className="text-base-content/60 text-sm">{player.country}</span>}
                    {isPending ? (
                      <span className="badge badge-warning">Pending</span>
                    ) : (
                      <button
                        onClick={() => handleInvitePlayer(player.id)}
                        disabled={inviteLoading}
                        className="btn btn-primary btn-xs"
                      >
                        Invite
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {pendingInvites.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-sm text-base-content/60">Pending Invites</h3>
              {pendingInvites.map(invite => (
                <div key={invite.id} className="flex items-center gap-3 bg-base-300 p-3 rounded-lg">
                  <div className="avatar">
                    <div className="rounded-full w-8 overflow-hidden">
                      {invite.profiles.avatar_url ? (
                        <img src={invite.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center">
                          <span className="text-xs">{invite.profiles.username.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="flex-1">{invite.profiles.username}</span>
                  <span className="badge badge-warning badge-sm">Pending</span>
                  <button onClick={() => handleCancelInvite(invite.id)} className="btn btn-ghost btn-xs text-error">Cancel</button>
                </div>
              ))}
            </div>
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
                <div key={member.id} className="flex items-center gap-4 bg-base-300 p-3 rounded-lg">
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
                  <Link to={`/profile/${member.profiles.id}`} className="font-medium flex-1 link link-hover">
                    {member.profiles.username}
                  </Link>
                  <span className={`badge ${member.role === 'captain' ? 'badge-secondary' : 'badge-ghost'}`}>
                    {member.role}
                  </span>
                  <button onClick={() => handleRemoveMember(member.id)} className="btn btn-error btn-xs">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}