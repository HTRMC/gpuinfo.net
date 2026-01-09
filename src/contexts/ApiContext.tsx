import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type ApiType = 'vulkan' | 'opengl' | 'opencl'

interface ApiConfig {
  label: string
  href: string
  logo: string
  favicon: string
}

export const apiConfigs: Record<ApiType, ApiConfig> = {
  vulkan: {
    label: 'Vulkan',
    href: '/',
    logo: '/vulkan-logo.svg',
    favicon: '/vulkan-logo-bug.svg',
  },
  opengl: {
    label: 'OpenGL',
    href: '/opengl',
    logo: '/opengl-logo.svg',
    favicon: '/opengl-logo-bug.png',
  },
  opencl: {
    label: 'OpenCL',
    href: '/opencl',
    logo: '/opencl-logo.svg',
    favicon: '/vulkan-logo-bug.svg', // Using vulkan bug as fallback since no opencl bug exists
  },
}

interface ApiContextType {
  api: ApiType
  setApi: (api: ApiType) => void
  config: ApiConfig
}

const ApiContext = createContext<ApiContextType | null>(null)

export function ApiProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<ApiType>('vulkan')
  const config = apiConfigs[api]

  // Update favicon when API changes
  useEffect(() => {
    const existingFavicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')

    if (existingFavicon) {
      existingFavicon.href = config.favicon
    } else {
      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = config.favicon
      document.head.appendChild(link)
    }
  }, [config.favicon])

  return (
    <ApiContext.Provider value={{ api, setApi, config }}>
      {children}
    </ApiContext.Provider>
  )
}

export function useApi() {
  const context = useContext(ApiContext)
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return context
}
