import { createFileRoute, Link } from '@tanstack/react-router'
import { Monitor, Cpu, Layers, Database, ChevronRight } from 'lucide-react'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const stats = [
    { label: 'GPU Reports', value: '4,530+' },
    { label: 'Extensions Tracked', value: '350+' },
    { label: 'Properties', value: '200+' },
    { label: 'Platforms', value: '5' },
  ]

  const quickLinks = [
    {
      icon: <Layers className="w-8 h-8" />,
      title: 'Extensions',
      description: 'Browse Vulkan extension coverage across devices',
      href: '/extensions',
    },
    {
      icon: <Monitor className="w-8 h-8" />,
      title: 'Devices',
      description: 'Explore GPU hardware reports and capabilities',
      href: '/devices',
    },
    {
      icon: <Cpu className="w-8 h-8" />,
      title: 'Features',
      description: 'Check feature support across different GPUs',
      href: '/features',
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: 'Properties',
      description: 'Compare device properties and limits',
      href: '/properties',
    },
  ]

  return (
    <div className="min-h-screen bg-[#181a1b]">
      {/* Hero Section */}
      <section className="bg-[#111111] text-white py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            GPU<span className="text-red-500">info</span>
          </h1>
          <p className="text-xl text-[#787571] mb-8 max-w-2xl mx-auto">
            A comprehensive database of GPU hardware capabilities, extensions, and features across Vulkan, OpenGL, and OpenCL.
          </p>
          <Link
            to="/extensions"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition-colors"
          >
            Browse Extensions
            <ChevronRight size={20} />
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-[#222222] border-b border-[#292c2e] py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-[#787571] text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Explore the Database</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.title}
                to={link.href}
                className="flex items-start gap-4 p-6 bg-[#222222] rounded-lg border border-[#292c2e] hover:border-[#343434] hover:bg-[#343434] transition-all group"
              >
                <div className="text-white group-hover:text-red-500 transition-colors">
                  {link.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-red-500 transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-[#787571] text-sm mt-1">{link.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* API Section */}
      <section className="py-12 px-4 bg-[#222222] border-t border-[#292c2e]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Supported APIs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 border border-[#292c2e] rounded-lg bg-[#181a1b]">
              <div className="flex items-center gap-3 mb-3">
                <img src="/vulkan-logo.svg" alt="Vulkan" className="w-8 h-8" />
                <h3 className="font-semibold text-lg text-white">Vulkan</h3>
              </div>
              <p className="text-[#787571] text-sm">
                Modern, low-level graphics and compute API with extensive hardware support data.
              </p>
              <div className="mt-3 text-red-500 font-medium text-sm">Active</div>
            </div>
            <div className="p-6 border border-[#292c2e] rounded-lg bg-[#181a1b] opacity-60">
              <div className="flex items-center gap-3 mb-3">
                <img src="/opengl-logo.svg" alt="OpenGL" className="w-8 h-8" />
                <h3 className="font-semibold text-lg text-white">OpenGL</h3>
              </div>
              <p className="text-[#787571] text-sm">
                Cross-platform graphics API with broad legacy and modern device coverage.
              </p>
              <div className="mt-3 text-[#787571] font-medium text-sm">Coming Soon</div>
            </div>
            <div className="p-6 border border-[#292c2e] rounded-lg bg-[#181a1b] opacity-60">
              <div className="flex items-center gap-3 mb-3">
                <img src="/opencl-logo.svg" alt="OpenCL" className="w-8 h-8" />
                <h3 className="font-semibold text-lg text-white">OpenCL</h3>
              </div>
              <p className="text-[#787571] text-sm">
                Open standard for parallel programming across heterogeneous platforms.
              </p>
              <div className="mt-3 text-[#787571] font-medium text-sm">Coming Soon</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111111] text-[#787571] py-8 px-4 border-t border-[#292c2e]">
        <div className="max-w-5xl mx-auto text-center text-sm">
          <p>
            GPUinfo.net - A modern GPU hardware database
          </p>
          <p className="mt-2">
            Inspired by <a href="https://gpuinfo.org" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">gpuinfo.org</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
