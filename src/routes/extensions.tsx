import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PlatformFilter, type Platform } from '@/components/PlatformFilter'
import { ExtensionsTable } from '@/components/ExtensionsTable'
import { mockExtensions } from '@/data/mock-extensions'

export const Route = createFileRoute('/extensions')({
  component: ExtensionsPage,
})

function ExtensionsPage() {
  const [platform, setPlatform] = useState<Platform>('all')

  // In the future, this will filter based on platform
  // For now, we show all extensions regardless of platform selection
  const filteredExtensions = mockExtensions

  return (
    <div className="min-h-screen bg-[#181a1b]">
      <PlatformFilter selected={platform} onChange={setPlatform} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Vulkan Extensions</h1>
          <p className="text-[#787571] mt-1">
            Device coverage for Vulkan extensions across {mockExtensions[0]?.totalDevices.toLocaleString()} reported devices
          </p>
        </div>

        <ExtensionsTable data={filteredExtensions} />
      </main>
    </div>
  )
}
