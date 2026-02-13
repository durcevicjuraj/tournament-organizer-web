import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { getData } from 'country-list'

interface Team {
  id: string
  name: string
  country: string | null
  logo_url: string | null
  created_at: string
  games: { id: string; name: string }
}

interface Game {
  id: string
  name: string
}

const TEAMS_PER_PAGE = 10
const allCountries = getData().sort((a, b) => a.name.localeCompare(b.name))

export default function Teams() {
  const [ownedTeams, setOwnedTeams] = useState<Team[]>([])
  const [memberTeams, setMemberTeams] = useState<Team[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'owned' | 'member' | 'browse'>('owned')

  const [searchName, setSearchName] = useState('')
  const [searchGame, setSearchGame] = useState('')
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [countrySearch, setCountrySearch] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [page, setPage] = useState(1)

  const countryDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [owned, member, all, gamesData] = await Promise.all([
        supabase.from('teams').select('*, games(id, name)').eq('created_by', user.id).order('created_at', { ascending: false }),
        supabase.from('team_members').select('teams(*, games(id, name))').eq('player_id', user.id),
        supabase.from('teams').select('*, games(id, name)').order('created_at', { ascending: false }),
        supabase.from('games').select('id, name').order('name')
      ])

      if (owned.data) setOwnedTeams(owned.data)
      if (member.data) {
        const teams = member.data.map((m: any) => m.teams).filter(Boolean)
        setMemberTeams(teams)
      }
      if (all.data) setAllTeams(all.data)
      if (gamesData.data) setGames(gamesData.data)

      setLoading(false)
    }

    fetchData()
  }, [])

  const toggleCountry = (name: string) => {
    setSelectedCountries(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    )
    setPage(1)
  }

  const filteredCountries = allCountries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const filterTeams = (teams: Team[]) => {
    return teams.filter(t =>
      t.name.toLowerCase().includes(searchName.toLowerCase()) &&
      (searchGame === '' || t.games?.id === searchGame) &&
      (selectedCountries.length === 0 || (t.country !== null && selectedCountries.includes(t.country)))
    )
  }

  const handleTabChange = (newTab: 'owned' | 'member' | 'browse') => {
    setTab(newTab)
    setPage(1)
    setSearchName('')
    setSearchGame('')
    setSelectedCountries([])
    setCountrySearch('')
  }

  const currentTeams = tab === 'owned' ? ownedTeams : tab === 'member' ? memberTeams : allTeams
  const filtered = filterTeams(currentTeams)
  const totalPages = Math.ceil(filtered.length / TEAMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * TEAMS_PER_PAGE, page * TEAMS_PER_PAGE)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-8 flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Teams</h1>
        <Link to="/teams/create" className="btn btn-primary">Create Team</Link>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed">
        <button
          className={`tab ${tab === 'owned' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('owned')}
        >
          My Teams ({ownedTeams.length})
        </button>
        <button
          className={`tab ${tab === 'member' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('member')}
        >
          Member Of ({memberTeams.length})
        </button>
        <button
          className={`tab ${tab === 'browse' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('browse')}
        >
          Browse All
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-4">
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
            {games.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* Country dropdown */}
        <div className="relative" ref={countryDropdownRef}>
          <div
            className="input input-bordered w-full flex items-center justify-between cursor-pointer"
            onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
          >
            <span className={selectedCountries.length === 0 ? 'text-base-content/40' : ''}>
              {selectedCountries.length === 0 ? 'Filter by country...' : `${selectedCountries.length} country selected`}
            </span>
            <span className={`transition-transform duration-200 ${countryDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
          </div>
          {countryDropdownOpen && (
            <div className="absolute z-50 w-full bg-base-200 border border-base-300 rounded-lg mt-1 shadow-lg">
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="input input-bordered input-sm w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              {selectedCountries.length > 0 && (
                <div className="px-2 pb-1">
                  <button
                    onClick={() => { setSelectedCountries([]); setPage(1) }}
                    className="btn btn-ghost btn-xs text-error"
                  >
                    Clear all
                  </button>
                </div>
              )}
              <div className="max-h-48 overflow-y-auto">
                {filteredCountries.map(c => (
                  <label
                    key={c.code}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-base-300 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCountries.includes(c.name)}
                      onChange={() => toggleCountry(c.name)}
                      className="checkbox checkbox-primary checkbox-sm"
                    />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selected country badges */}
        {selectedCountries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCountries.map(c => (
              <span
                key={c}
                className="badge badge-primary gap-1 cursor-pointer"
                onClick={() => toggleCountry(c)}
              >
                {c} ✕
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Teams List */}
      {paginated.length === 0 ? (
        <div className="hero bg-base-200 rounded-xl py-16">
          <div className="hero-content text-center">
            <div>
              <h2 className="text-xl font-semibold mb-2">No teams found</h2>
              {tab === 'owned' && searchName === '' && searchGame === '' && selectedCountries.length === 0 && (
                <Link to="/teams/create" className="btn btn-primary mt-4">
                  Create Team
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {paginated.map((team) => (
            <Link
              key={team.id}
              to={`/teams/${team.id}`}
              className="card bg-base-200 hover:bg-base-300 transition cursor-pointer"
            >
              <div className="card-body flex-row items-center gap-4">
                <div className="avatar">
                  <div className="rounded-xl w-12 overflow-hidden">
                    {team.logo_url ? (
                      <img src={team.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="bg-neutral text-neutral-content w-12 h-12 flex items-center justify-center rounded-xl">
                        <span className="text-lg">{team.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="card-title">{team.name}</h2>
                  <p className="text-base-content/60 text-sm mt-1">
                    {team.games?.name}
                    {team.country && ` · ${team.country}`}
                  </p>
                </div>
                {tab === 'owned' && (
                  <span className="badge badge-primary">Owner</span>
                )}
                {tab === 'member' && (
                  <span className="badge badge-secondary">Member</span>
                )}
              </div>
            </Link>
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
  )
}