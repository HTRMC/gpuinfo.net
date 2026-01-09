import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Check, X } from 'lucide-react'

export interface Extension {
  name: string
  coverage: number
  deviceCount: number
  totalDevices: number
  dateAdded: string
  hasFeatures: boolean
  hasProperties: boolean
}

interface ExtensionsTableProps {
  data: Extension[]
}

const columnHelper = createColumnHelper<Extension>()

export function ExtensionsTable({ data }: ExtensionsTableProps) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Extension',
        cell: (info) => (
          <a
            href={`/extension/${info.getValue()}`}
            className="text-blue-400 hover:text-blue-300 hover:underline font-mono text-sm"
          >
            {info.getValue()}
          </a>
        ),
      }),
      columnHelper.accessor('coverage', {
        header: 'Coverage',
        cell: (info) => {
          const value = info.getValue()
          return (
            <div className="flex items-center gap-2">
              <div className="w-24 bg-[#111111] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-sm text-[#787571] w-12">{value.toFixed(1)}%</span>
            </div>
          )
        },
      }),
      columnHelper.accessor((row) => `${row.deviceCount}/${row.totalDevices}`, {
        id: 'devices',
        header: 'Devices',
        cell: (info) => <span className="text-sm text-[#787571]">{info.getValue()}</span>,
      }),
      columnHelper.accessor('dateAdded', {
        header: 'Date',
        cell: (info) => <span className="text-sm text-[#787571]">{info.getValue()}</span>,
      }),
      columnHelper.accessor('hasFeatures', {
        header: 'Features',
        cell: (info) => (
          <div className="flex justify-center items-center h-5 w-5 mx-auto">
            {info.getValue() ? (
              <Check className="text-green-500 shrink-0" size={18} />
            ) : (
              <X className="text-[#343434] shrink-0" size={18} />
            )}
          </div>
        ),
      }),
      columnHelper.accessor('hasProperties', {
        header: 'Properties',
        cell: (info) => (
          <div className="flex justify-center items-center h-5 w-5 mx-auto">
            {info.getValue() ? (
              <Check className="text-green-500 shrink-0" size={18} />
            ) : (
              <X className="text-[#343434] shrink-0" size={18} />
            )}
          </div>
        ),
      }),
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="bg-[#222222] rounded-lg border border-[#292c2e] overflow-hidden">
      {/* Search bar */}
      <div className="p-4 border-b border-[#292c2e]">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#787571]" size={18} />
          <input
            type="text"
            placeholder="Search extensions..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#181a1b] border border-[#292c2e] rounded-lg text-white placeholder-[#787571] focus:ring-2 focus:ring-[#343434] focus:border-[#343434] outline-none"
          />
        </div>
        <div className="mt-2 text-sm text-[#787571]">
          Showing {table.getFilteredRowModel().rows.length} of {data.length} extensions
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#181a1b] border-b border-[#292c2e]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-[#787571] uppercase tracking-wider cursor-pointer hover:bg-[#343434] select-none transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ArrowUp size={14} className="text-white" />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ArrowDown size={14} className="text-white" />
                      ) : (
                        <ArrowUpDown size={14} className="text-[#343434]" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-[#222222]">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-[#343434] transition-colors border-b border-[#292c2e] last:border-b-0">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-white">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {table.getFilteredRowModel().rows.length === 0 && (
        <div className="p-8 text-center text-[#787571]">No extensions found matching your search.</div>
      )}
    </div>
  )
}
