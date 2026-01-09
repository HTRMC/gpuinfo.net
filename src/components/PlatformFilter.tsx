import { Monitor, Smartphone, Apple } from 'lucide-react'

export type Platform = 'all' | 'windows' | 'linux' | 'android' | 'macos' | 'ios'

interface PlatformFilterProps {
  selected: Platform
  onChange: (platform: Platform) => void
}

const platforms: { id: Platform; label: string; icon?: React.ReactNode }[] = [
  { id: 'all', label: 'All platforms' },
  { id: 'windows', label: 'Windows', icon: <Monitor size={16} /> },
  { id: 'linux', label: 'Linux', icon: <Monitor size={16} /> },
  { id: 'android', label: 'Android', icon: <Smartphone size={16} /> },
  { id: 'macos', label: 'macOS', icon: <Apple size={16} /> },
  { id: 'ios', label: 'iOS', icon: <Smartphone size={16} /> },
]

export function PlatformFilter({ selected, onChange }: PlatformFilterProps) {
  return (
    <div className="bg-[#222222] border-b border-[#292c2e]">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[#787571] mr-2">Platform:</span>
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => onChange(platform.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors
                ${selected === platform.id
                  ? 'bg-[#343434] text-white border border-[#292c2e]'
                  : 'bg-[#181a1b] text-[#787571] hover:bg-[#343434] hover:text-white border border-[#292c2e]'
                }
              `}
            >
              {platform.icon}
              {platform.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
