import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { getData } from 'country-list'

interface Game {
  id: string
  name: string
}

const allCountries = getData().sort((a, b) => a.name.localeCompare(b.name))

export default function CreateTeam() {
  const navigate = useNavigate()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [gameId, setGameId] = useState('')
  const [country, setCountry] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)

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
    const fetchGames = async () => {
      const { data } = await supabase.from('games').select('*')
      if (data) {
        setGames(data)
        setGameId(data[0]?.id || '')
      }
    }
    fetchGames()
  }, [])

  const filteredCountries = allCountries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const handleCountrySelect = (name: string) => {
    setCountry(name)
    setCountrySearch(name)
    setCountryDropdownOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.rpc('create_team', {
      p_name: name,
      p_game_id: gameId,
      p_created_by: user!.id,
      p_country: country || null
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate('/teams')
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Create Team</h1>

      {error && <div className="alert alert-error mb-6"><span>{error}</span></div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        <label className="form-control">
          <div className="label"><span className="label-text">Team Name</span></div>
          <input
            type="text"
            placeholder="My Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input input-bordered w-full"
            required
          />
        </label>

        <label className="form-control">
          <div className="label"><span className="label-text">Game</span></div>
          <select
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="select select-bordered w-full"
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </label>

        {/* Country dropdown */}
        <div className="form-control">
          <div className="label"><span className="label-text">Country (optional)</span></div>
          <div className="relative" ref={countryDropdownRef}>
            <input
              type="text"
              placeholder="Search country..."
              value={countrySearch}
              onChange={(e) => {
                setCountrySearch(e.target.value)
                setCountry('')
                setCountryDropdownOpen(true)
              }}
              onFocus={() => setCountryDropdownOpen(true)}
              className="input input-bordered w-full"
            />
            {countryDropdownOpen && countrySearch && (
              <div className="absolute z-50 w-full bg-base-200 border border-base-300 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                {filteredCountries.length === 0 ? (
                  <div className="p-3 text-base-content/60 text-sm">No countries found</div>
                ) : (
                  filteredCountries.map(c => (
                    <div
                      key={c.code}
                      onClick={() => handleCountrySelect(c.name)}
                      className="p-3 hover:bg-base-300 cursor-pointer text-sm"
                    >
                      {c.name}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {country && (
            <div className="label">
              <span
                className="label-text-alt text-error cursor-pointer"
                onClick={() => { setCountry(''); setCountrySearch('') }}
              >
                Clear
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? <span className="loading loading-spinner"></span> : 'Create Team'}
        </button>
      </form>
    </div>
  )
}