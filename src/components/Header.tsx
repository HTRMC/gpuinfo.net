import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
import { useApi, apiConfigs, type ApiType } from '../contexts/ApiContext'

const navItems = [
  { label: 'Devices', href: '/devices' },
  { label: 'Reports', href: '/reports' },
  { label: 'Properties', href: '/properties' },
  { label: 'Features', href: '/features' },
  { label: 'Extensions', href: '/extensions' },
  { label: 'Formats', href: '/formats' },
  { label: 'Memory', href: '/memory' },
  { label: 'Surface', href: '/surface' },
  { label: 'Instance', href: '/instance' },
  { label: 'Profiles', href: '/profiles' },
]

const apiOptions: ApiType[] = ['vulkan', 'opengl', 'opencl']

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [apiDropdownOpen, setApiDropdownOpen] = useState(false)
  const { api, setApi, config } = useApi()

  const handleApiSelect = (selectedApi: ApiType) => {
    setApi(selectedApi)
    setApiDropdownOpen(false)
  }

  return (
    <header className="bg-[#181a1b] text-white shadow-md">
      {/* Top bar with logo and API selector */}
      <div className="border-b border-[#292c2e]">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={config.logo}
              alt={config.label}
              className="h-8 w-8"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <span className="text-xl font-bold tracking-tight">
              GPU<span className="text-red-500">info</span>
            </span>
          </Link>

          {/* API Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setApiDropdownOpen(!apiDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#222222] hover:bg-[#343434] border border-[#292c2e] transition-colors text-sm"
            >
              <img src={config.logo} alt={config.label} className="w-5 h-5" />
              <span>{config.label}</span>
              <ChevronDown size={16} className={`transition-transform ${apiDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {apiDropdownOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-[#222222] border border-[#292c2e] rounded shadow-lg z-50">
                {apiOptions.map((apiKey) => {
                  const apiConfig = apiConfigs[apiKey]
                  return (
                    <button
                      key={apiKey}
                      className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#343434] w-full text-left ${api === apiKey ? 'text-red-400' : ''}`}
                      onClick={() => handleApiSelect(apiKey)}
                    >
                      <img src={apiConfig.logo} alt={apiConfig.label} className="w-5 h-5" />
                      {apiConfig.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="max-w-7xl mx-auto px-4">
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 py-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="px-3 py-2 text-sm font-medium rounded hover:bg-[#343434] transition-colors"
              activeProps={{
                className: 'px-3 py-2 text-sm font-medium rounded bg-[#343434] text-white',
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden py-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-[#343434] rounded transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile nav */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#292c2e] px-4 py-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="block px-3 py-2 text-sm font-medium rounded hover:bg-[#343434] transition-colors"
              activeProps={{
                className: 'block px-3 py-2 text-sm font-medium rounded bg-[#343434] text-white',
              }}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
