import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { getData } from 'country-list'

interface Player {
  id: string
  username: string
  country: string | null
  avatar_url: string | null
  games: { id: string; name: string }[]
  teams: { id: string; name: string }[]
}

interface Game {
  id: string
  name: string
}

const PLAYERS_PER_PAGE = 10
const allCountries = getData().sort((a, b) => a.name.localeCompare(b.name))

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  const [searchUsername, setSearchUsername] = useState('')
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [countrySearch, setCountrySearch] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [searchGame, setSearchGame] = useState('')
  const [searchTeam, setSearchTeam] = useState('')
  const [page, setPage] = useState(1)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const [playersData, gamesData] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            id,
            username,
            country,
            avatar_url,
            player_games(games(id, name)),
            team_members(teams(id, name))
          `)
          .order('username'),
        supabase
          .from('games')
          .select('id, name')
          .order('name')
      ])

      if (playersData.data) {
        const mapped = playersData.data.map((p: any) => ({
          id: p.id,
          username: p.username,
          country: p.country,
          avatar_url: p.avatar_url,
          games: (p.player_games || []).map((pg: any) => pg.games).filter(Boolean),
          teams: (p.team_members || []).map((tm: any) => tm.teams).filter(Boolean)
        }))
        setPlayers(mapped)
      }

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

  const filtered = players.filter(p => {
    const usernameMatch = p.username.toLowerCase().includes(searchUsername.toLowerCase())
    const countryMatch = selectedCountries.length === 0 || (p.country !== null && selectedCountries.includes(p.country))
    const gameMatch = searchGame === '' || p.games.some(g => g.id === searchGame)
    const teamMatch = searchTeam === '' || p.teams.some(t => t.name.toLowerCase().includes(searchTeam.toLowerCase()))
    return usernameMatch && countryMatch && gameMatch && teamMatch
  })

  const totalPages = Math.ceil(filtered.length / PLAYERS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * PLAYERS_PER_PAGE, page * PLAYERS_PER_PAGE)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-8 flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Players</h1>

      {/* Filters */}
      <div className="card bg-base-200">
        <div className="card-body flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search by username..."
              value={searchUsername}
              onChange={(e) => { setSearchUsername(e.target.value); setPage(1) }}
              className="input input-bordered w-full"
            />

            {/* Country Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div
                className="input input-bordered w-full flex items-center justify-between cursor-pointer"
                onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
              >
                <span className={selectedCountries.length === 0 ? 'text-base-content/40' : ''}>
                  {selectedCountries.length === 0
                    ? 'Filter by country...'
                    : `${selectedCountries.length} country selected`
                  }
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

            <select
              value={searchGame}
              onChange={(e) => { setSearchGame(e.target.value); setPage(1) }}
              className="select select-bordered w-full"
            >
              <option value="">All Games</option>
              {games.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search by team name..."
              value={searchTeam}
              onChange={(e) => { setSearchTeam(e.target.value); setPage(1) }}
              className="input input-bordered w-full"
            />
          </div>

          {/* Selected Countries */}
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
      </div>

      {/* Players List */}
      {paginated.length === 0 ? (
        <div className="hero bg-base-200 rounded-xl py-16">
          <div className="hero-content text-center">
            <p className="text-base-content/60">No players found.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {paginated.map(player => (
            <Link
              key={player.id}
              to={`/profile/${player.id}`}
              className="card bg-base-200 hover:bg-base-300 transition cursor-pointer"
            >
              <div className="card-body flex-row items-center gap-4">
                <div className="avatar">
                  <div className="rounded-full w-12 overflow-hidden">
                    {player.avatar_url ? (
                      <img src={player.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="bg-neutral text-neutral-content rounded-full w-12 h-12 flex items-center justify-center">
                        <span className="text-lg">{player.username.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="font-semibold text-lg">{player.username}</h2>
                  {player.country && (
                    <p className="text-base-content/60 text-sm">{player.country}</p>
                  )}
                  {player.games.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {player.games.map(g => (
                        <span key={g.id} className="badge badge-primary badge-sm">{g.name}</span>
                      ))}
                    </div>
                  )}
                </div>

                {player.teams.length > 0 && (
                  <div className="text-right text-sm text-base-content/60">
                    <p>{player.teams.length} team{player.teams.length > 1 ? 's' : ''}</p>
                  </div>
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