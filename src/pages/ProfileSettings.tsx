import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { getData } from 'country-list'

interface Game {
  id: string
  name: string
}

const countries = getData().sort((a, b) => a.name.localeCompare(b.name))

export default function ProfileSettings() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [userId, setUserId] = useState('')
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [allGames, setAllGames] = useState<Game[]>([])
  const [countrySearch, setCountrySearch] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [profileData, playerGames, gamesData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('player_games').select('game_id').eq('player_id', user.id),
        supabase.from('games').select('*').order('name')
      ])

      if (profileData.data) {
        setUsername(profileData.data.username || '')
        setCountry(profileData.data.country || '')
        setAvatarUrl(profileData.data.avatar_url || '')
        setCountrySearch(profileData.data.country || '')
      }
      if (playerGames.data) {
        setSelectedGames(playerGames.data.map((pg: any) => pg.game_id))
      }
      if (gamesData.data) setAllGames(gamesData.data)

      setLoading(false)
    }

    fetchData()
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Provjeri tip filea
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Provjeri velicinu (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB')
      return
    }

    setUploading(true)
    setError('')

    const fileExt = file.name.split('.').pop()
    const filePath = `${userId}/avatar.${fileExt}`

    // Upload na Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    // Dohvati public URL
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    setAvatarUrl(data.publicUrl)
    setUploading(false)
  }

  const handleGameToggle = (gameId: string) => {
    setSelectedGames(prev =>
      prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    )
  }

  const handleCountrySelect = (name: string) => {
    setCountry(name)
    setCountrySearch(name)
    setCountryDropdownOpen(false)
  }

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        username,
        country: country || null,
        avatar_url: avatarUrl || null
      })
      .eq('id', userId)

    if (profileError) {
      setError(profileError.message)
      setSaving(false)
      return
    }

    await supabase.from('player_games').delete().eq('player_id', userId)

    if (selectedGames.length > 0) {
      const { error: gamesError } = await supabase
        .from('player_games')
        .insert(selectedGames.map(gameId => ({
          player_id: userId,
          game_id: gameId
        })))

      if (gamesError) {
        setError(gamesError.message)
        setSaving(false)
        return
      }
    }

    setSuccess(true)
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-8 flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <button
          onClick={() => navigate(`/profile/${userId}`)}
          className="btn btn-ghost btn-sm"
        >
          ← Back to Profile
        </button>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}
      {success && <div className="alert alert-success"><span>Profile updated successfully!</span></div>}

      <form onSubmit={handleSave} className="flex flex-col gap-6">

        {/* Avatar */}
        <div className="form-control">
          <div className="label"><span className="label-text">Profile Picture</span></div>
          <div className="flex items-center gap-6">
            <div className="avatar placeholder">
              <div className="rounded-full w-20 overflow-hidden bg-neutral">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-neutral-content">
                    {username?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn btn-outline btn-sm"
              >
                {uploading ? <span className="loading loading-spinner loading-xs"></span> : 'Upload Picture'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="btn btn-ghost btn-sm text-error"
                >
                  Remove
                </button>
              )}
              <span className="text-base-content/40 text-xs">Max 2MB, image files only</span>
            </div>
          </div>
        </div>

        {/* Username */}
        <label className="form-control">
          <div className="label"><span className="label-text">Username</span></div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input input-bordered w-full"
            required
          />
        </label>

        {/* Country */}
        <div className="form-control">
          <div className="label"><span className="label-text">Country (optional)</span></div>
          <div className="relative">
            <input
              type="text"
              value={countrySearch}
              onChange={(e) => {
                setCountrySearch(e.target.value)
                setCountry('')
                setCountryDropdownOpen(true)
              }}
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
              <span className="label-text-alt text-success"></span>
              <span
                className="label-text-alt text-error cursor-pointer"
                onClick={() => { setCountry(''); setCountrySearch('') }}
              >
                Clear
              </span>
            </div>
          )}
        </div>

        {/* Games */}
        <div className="form-control">
          <div className="label"><span className="label-text">Games I Play</span></div>
          <div className="flex flex-wrap gap-2">
            {allGames.map(game => (
              <div
                key={game.id}
                onClick={() => handleGameToggle(game.id)}
                className={`badge badge-lg cursor-pointer select-none ${
                  selectedGames.includes(game.id)
                    ? 'badge-primary'
                    : 'badge-outline'
                }`}
              >
                {game.name}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || uploading}
          className="btn btn-primary w-full"
        >
          {saving ? <span className="loading loading-spinner"></span> : 'Save Changes'}
        </button>

      </form>
    </div>
  )
}