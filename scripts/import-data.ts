/**
 * Data Import Script (Optimized)
 *
 * Imports GPU data from JSON files into the Neon database.
 * Uses bulk inserts, streaming JSON parsing, and parallel processing for speed.
 *
 * Usage:
 *   DATABASE_URL=<your-neon-url> bun run scripts/import-data.ts
 */

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { readFileSync, createReadStream } from 'fs'
import { join } from 'path'
import { parser } from 'stream-json'
import { streamArray } from 'stream-json/streamers/StreamArray'

import * as schema from '../src/db/schema'

// Get database URL
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL or VITE_DATABASE_URL must be set')
  process.exit(1)
}

const sql = neon(DATABASE_URL)
const db = drizzle(sql, { schema })

// Configuration
const DEVICE_BATCH_SIZE = 100  // Devices per batch
const INSERT_BATCH_SIZE = 100  // Rows per INSERT (reduced to avoid query size limits)
const CONCURRENCY = 3          // Parallel batch processing

// Helper to parse coverage from HTML string
function parseCoverage(html: string | null): number {
  if (!html) return 0
  const match = html.match(/>([\d.]+)</)
  return match ? parseFloat(match[1]) : 0
}

// Helper to determine platform from ostype
function getPlatform(ostype: number): string {
  switch (ostype) {
    case 0: return 'windows'
    case 1: return 'linux'
    case 2: return 'android'
    case 3: return 'macos'
    case 4: return 'ios'
    default: return 'linux'
  }
}

// Helper to sanitize strings
function sanitizeString(str: string | null | undefined): string {
  if (!str) return ''
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim()
}

// Load JSON file
function loadJson<T>(filename: string): T {
  const path = join(process.cwd(), 'public/data', filename)
  console.log(`Loading ${filename}...`)
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}

// Types
interface ExtensionJson {
  name: string
  coverage: string
  coverage_unsupported: string
  features_url: string | null
  properties_url: string | null
  date: string
}

interface ExtensionByPlatformJson {
  name: string
  coverage: string
  coverage_unsupported: string
}

interface SummaryJson {
  scrape_date: string
  total_extensions: number
  total_reports: number
  platforms: string[]
  source: string
  license: string
}

interface DeviceReportJson {
  _report_id: number
  properties: {
    deviceName: string
    deviceID: number
    vendorID: number
    deviceType: number
    deviceTypeText: string
    apiVersion: number
    apiVersionText: string
    driverVersion: number
    driverVersionText: string
    limits: Record<string, unknown>
    sparseProperties: Record<string, unknown>
    subgroupProperties: Record<string, unknown>
  }
  environment: {
    name: string
    ostype: number
    version: string
    architecture: string
    submitter: string
  }
  extensions: Array<{ extensionName: string; specVersion: number }>
  core11?: { features: Record<string, number>; properties: Record<string, unknown> }
  core12?: { features: Record<string, number>; properties: Record<string, unknown> }
  core13?: { features: Record<string, number>; properties: Record<string, unknown> }
  core14?: { features: Record<string, number>; properties: Record<string, unknown> }
  extended?: {
    devicefeatures2?: Array<{ extension: string; name: string; supported: boolean }>
    deviceproperties2?: Array<{ extension: string; name: string; value: unknown }>
  }
}

// Chunk array into batches
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

// Process batches with controlled concurrency
async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  concurrency: number,
  processor: (batch: T[], batchIndex: number) => Promise<R>
): Promise<R[]> {
  const batches = chunk(items, batchSize)
  const results: R[] = []

  for (let i = 0; i < batches.length; i += concurrency) {
    const concurrentBatches = batches.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      concurrentBatches.map((batch, idx) => processor(batch, i + idx))
    )
    results.push(...batchResults)

    const progress = Math.min(100, Math.round(((i + concurrency) / batches.length) * 100))
    process.stdout.write(`\rProgress: ${progress}%`)
  }
  console.log()
  return results
}

async function importExtensions() {
  console.log('\n=== Importing Extensions ===')

  const extensionsData = loadJson<ExtensionJson[]>('extensions.json')
  const extensionsByPlatform = loadJson<Record<string, ExtensionByPlatformJson[]>>('extensions_by_platform.json')
  const summary = loadJson<SummaryJson>('summary.json')

  console.log(`Found ${extensionsData.length} extensions`)

  // Bulk insert extensions
  const extensionMap = new Map<string, number>()

  const extensionValues = extensionsData.map(ext => ({
    name: ext.name,
    dateAdded: ext.date || null,
    hasFeatures: ext.features_url !== null,
    hasProperties: ext.properties_url !== null,
  }))

  // Insert in batches
  for (const batch of chunk(extensionValues, INSERT_BATCH_SIZE)) {
    const results = await db.insert(schema.extensions).values(batch)
      .onConflictDoUpdate({
        target: schema.extensions.name,
        set: {
          dateAdded: schema.extensions.dateAdded,
          hasFeatures: schema.extensions.hasFeatures,
          hasProperties: schema.extensions.hasProperties,
        }
      })
      .returning({ id: schema.extensions.id, name: schema.extensions.name })

    for (const r of results) {
      extensionMap.set(r.name, r.id)
    }
  }

  console.log(`Inserted ${extensionMap.size} extensions`)

  // Bulk insert coverage for 'all' platform
  console.log('Importing coverage for all platforms...')
  const allCoverageValues = extensionsData
    .filter(ext => extensionMap.has(ext.name))
    .map(ext => ({
      extensionId: extensionMap.get(ext.name)!,
      platform: 'all',
      coveragePercent: parseCoverage(ext.coverage).toString(),
      deviceCount: Math.round((parseCoverage(ext.coverage) / 100) * summary.total_reports),
      totalDevices: summary.total_reports,
    }))

  for (const batch of chunk(allCoverageValues, INSERT_BATCH_SIZE)) {
    await db.insert(schema.extensionCoverage).values(batch).onConflictDoNothing()
  }

  // Insert coverage by platform
  const platforms = ['windows', 'linux', 'android', 'macos', 'ios']
  for (const platform of platforms) {
    const platformData = extensionsByPlatform[platform]
    if (!platformData) continue

    console.log(`Importing coverage for ${platform} (${platformData.length} extensions)...`)

    const coverageValues = platformData
      .filter(ext => extensionMap.has(ext.name))
      .map(ext => ({
        extensionId: extensionMap.get(ext.name)!,
        platform,
        coveragePercent: parseCoverage(ext.coverage).toString(),
        deviceCount: 0,
        totalDevices: 0,
      }))

    for (const batch of chunk(coverageValues, INSERT_BATCH_SIZE)) {
      await db.insert(schema.extensionCoverage).values(batch).onConflictDoNothing()
    }
  }

  // Insert scrape metadata
  await db.insert(schema.scrapeMeta).values({
    scrapeDate: new Date(summary.scrape_date),
    totalExtensions: summary.total_extensions,
    totalReports: summary.total_reports,
    source: summary.source,
    license: summary.license,
  })

  console.log('Extensions import complete!')
  return extensionMap
}

// Stream and process large JSON array
async function streamJsonArray<T>(filename: string, batchSize: number, processor: (batch: T[]) => Promise<void>): Promise<number> {
  const path = join(process.cwd(), 'public/data', filename)
  console.log(`Streaming ${filename}...`)

  return new Promise((resolve, reject) => {
    let batch: T[] = []
    let totalProcessed = 0
    let batchCount = 0
    const promises: Promise<void>[] = []

    const pipeline = createReadStream(path)
      .pipe(parser())
      .pipe(streamArray())

    pipeline.on('data', ({ value }: { value: T }) => {
      batch.push(value)

      if (batch.length >= batchSize) {
        const currentBatch = batch
        batch = []
        batchCount++
        totalProcessed += currentBatch.length

        // Process up to CONCURRENCY batches in parallel
        if (promises.length >= CONCURRENCY) {
          pipeline.pause()
          Promise.all(promises.splice(0, CONCURRENCY))
            .then(() => {
              process.stdout.write(`\rProcessed: ${totalProcessed} devices (${batchCount} batches)`)
              pipeline.resume()
            })
            .catch(reject)
        }

        promises.push(processor(currentBatch))
      }
    })

    pipeline.on('end', async () => {
      // Process remaining batch
      if (batch.length > 0) {
        promises.push(processor(batch))
        totalProcessed += batch.length
      }

      // Wait for all promises to complete
      await Promise.all(promises)
      console.log(`\rProcessed: ${totalProcessed} devices (${batchCount + 1} batches)`)
      resolve(totalProcessed)
    })

    pipeline.on('error', reject)
  })
}

async function importDevices(extensionMap: Map<string, number>) {
  console.log('\n=== Importing Devices ===')

  let totalImported = 0
  let totalErrors = 0

  const processBatch = async (batch: DeviceReportJson[]) => {
    // Collect all data for this batch
    const deviceValues: Parameters<typeof db.insert<typeof schema.devices>>[0]['values'][] = []
    const deviceExtValues: { reportId: number; extensionId: number; specVersion: number }[] = []
    const deviceLimitsValues: { reportId: number; limits: unknown; sparseProperties: unknown; subgroupProperties: unknown }[] = []
    const coreFeaturesValues: { reportId: number; coreVersion: string; features: unknown }[] = []
    const corePropsValues: { reportId: number; coreVersion: string; properties: unknown }[] = []
    const extFeaturesValues: { reportId: number; extensionName: string; featureName: string; supported: boolean }[] = []
    const extPropsValues: { reportId: number; extensionName: string; propertyName: string; value: unknown }[] = []

    for (const report of batch) {
      try {
        // Prepare device data
        deviceValues.push({
          reportId: report._report_id,
          deviceName: sanitizeString(report.properties.deviceName),
          vendorId: report.properties.vendorID,
          deviceId: report.properties.deviceID,
          deviceType: sanitizeString(report.properties.deviceTypeText),
          apiVersion: sanitizeString(report.properties.apiVersionText),
          apiVersionRaw: report.properties.apiVersion,
          driverVersion: sanitizeString(report.properties.driverVersionText),
          driverVersionRaw: report.properties.driverVersion,
          platform: getPlatform(report.environment.ostype),
          osName: sanitizeString(report.environment.name),
          osVersion: sanitizeString(report.environment.version),
          architecture: sanitizeString(report.environment.architecture),
          submitter: sanitizeString(report.environment.submitter),
        })

        // Prepare extensions
        if (report.extensions) {
          for (const ext of report.extensions) {
            const extId = extensionMap.get(ext.extensionName)
            if (extId) {
              deviceExtValues.push({
                reportId: report._report_id,
                extensionId: extId,
                specVersion: ext.specVersion,
              })
            }
          }
        }

        // Prepare limits
        deviceLimitsValues.push({
          reportId: report._report_id,
          limits: report.properties.limits || {},
          sparseProperties: report.properties.sparseProperties || {},
          subgroupProperties: report.properties.subgroupProperties || {},
        })

        // Prepare core features/properties
        const coreVersions = ['core11', 'core12', 'core13', 'core14'] as const
        for (const coreVersion of coreVersions) {
          const coreData = report[coreVersion]
          if (coreData?.features) {
            coreFeaturesValues.push({
              reportId: report._report_id,
              coreVersion,
              features: coreData.features,
            })
          }
          if (coreData?.properties) {
            corePropsValues.push({
              reportId: report._report_id,
              coreVersion,
              properties: coreData.properties,
            })
          }
        }

        // Prepare extended features
        if (report.extended?.devicefeatures2) {
          for (const f of report.extended.devicefeatures2) {
            extFeaturesValues.push({
              reportId: report._report_id,
              extensionName: f.extension,
              featureName: f.name,
              supported: f.supported,
            })
          }
        }

        // Prepare extended properties
        if (report.extended?.deviceproperties2) {
          for (const p of report.extended.deviceproperties2) {
            extPropsValues.push({
              reportId: report._report_id,
              extensionName: p.extension,
              propertyName: p.name,
              value: p.value,
            })
          }
        }
      } catch (error) {
        totalErrors++
      }
    }

    // Bulk insert devices and get IDs
    const deviceIdMap = new Map<number, number>() // reportId -> deviceId

    if (deviceValues.length > 0) {
      try {
        const deviceResults = await db.insert(schema.devices)
          .values(deviceValues as any)
          .onConflictDoNothing()
          .returning({ id: schema.devices.id, reportId: schema.devices.reportId })

        for (const r of deviceResults) {
          if (r.reportId) deviceIdMap.set(r.reportId, r.id)
        }
        totalImported += deviceResults.length
      } catch (error) {
        console.error(`\nDevice insert error:`, (error as Error).message?.slice(0, 100))
        totalErrors += deviceValues.length
        return
      }
    }

    // Insert related data using deviceIdMap
    const insertRelated = async () => {
      // Device extensions
      const extValuesWithIds = deviceExtValues
        .filter(v => deviceIdMap.has(v.reportId))
        .map(v => ({
          deviceId: deviceIdMap.get(v.reportId)!,
          extensionId: v.extensionId,
          specVersion: v.specVersion,
        }))

      for (const extBatch of chunk(extValuesWithIds, INSERT_BATCH_SIZE)) {
        try {
          await db.insert(schema.deviceExtensions).values(extBatch).onConflictDoNothing()
        } catch (e) { /* skip */ }
      }

      // Device limits
      const limitsWithIds = deviceLimitsValues
        .filter(v => deviceIdMap.has(v.reportId))
        .map(v => ({
          deviceId: deviceIdMap.get(v.reportId)!,
          limits: v.limits,
          sparseProperties: v.sparseProperties,
          subgroupProperties: v.subgroupProperties,
        }))

      for (const limitsBatch of chunk(limitsWithIds, INSERT_BATCH_SIZE)) {
        try {
          await db.insert(schema.deviceLimits).values(limitsBatch as any).onConflictDoNothing()
        } catch (e) { /* skip */ }
      }

      // Core features
      const coreFeaturesWithIds = coreFeaturesValues
        .filter(v => deviceIdMap.has(v.reportId))
        .map(v => ({
          deviceId: deviceIdMap.get(v.reportId)!,
          coreVersion: v.coreVersion,
          features: v.features,
        }))

      for (const cfBatch of chunk(coreFeaturesWithIds, INSERT_BATCH_SIZE)) {
        try {
          await db.insert(schema.deviceCoreFeatures).values(cfBatch as any).onConflictDoNothing()
        } catch (e) { /* skip */ }
      }

      // Core properties
      const corePropsWithIds = corePropsValues
        .filter(v => deviceIdMap.has(v.reportId))
        .map(v => ({
          deviceId: deviceIdMap.get(v.reportId)!,
          coreVersion: v.coreVersion,
          properties: v.properties,
        }))

      for (const cpBatch of chunk(corePropsWithIds, INSERT_BATCH_SIZE)) {
        try {
          await db.insert(schema.deviceCoreProperties).values(cpBatch as any).onConflictDoNothing()
        } catch (e) { /* skip */ }
      }

      // Extended features
      const extFeaturesWithIds = extFeaturesValues
        .filter(v => deviceIdMap.has(v.reportId))
        .map(v => ({
          deviceId: deviceIdMap.get(v.reportId)!,
          extensionName: v.extensionName,
          featureName: v.featureName,
          supported: v.supported,
        }))

      for (const efBatch of chunk(extFeaturesWithIds, INSERT_BATCH_SIZE)) {
        try {
          await db.insert(schema.deviceExtendedFeatures).values(efBatch).onConflictDoNothing()
        } catch (e) { /* skip */ }
      }

      // Extended properties
      const extPropsWithIds = extPropsValues
        .filter(v => deviceIdMap.has(v.reportId))
        .map(v => ({
          deviceId: deviceIdMap.get(v.reportId)!,
          extensionName: v.extensionName,
          propertyName: v.propertyName,
          value: v.value,
        }))

      for (const epBatch of chunk(extPropsWithIds, INSERT_BATCH_SIZE)) {
        try {
          await db.insert(schema.deviceExtendedProperties).values(epBatch as any).onConflictDoNothing()
        } catch (e) { /* skip */ }
      }
    }

    await insertRelated()
  }

  // Stream and process the large JSON file
  const totalProcessed = await streamJsonArray<DeviceReportJson>(
    'device_reports.json',
    DEVICE_BATCH_SIZE,
    processBatch
  )

  console.log(`\nDevices import complete! ${totalImported} imported, ${totalErrors} errors (${totalProcessed} processed)`)
}

async function main() {
  console.log('Starting optimized data import...')
  console.log(`Database: ${DATABASE_URL?.substring(0, 30)}...`)
  console.log(`Config: DEVICE_BATCH=${DEVICE_BATCH_SIZE}, INSERT_BATCH=${INSERT_BATCH_SIZE}, CONCURRENCY=${CONCURRENCY}`)

  const startTime = Date.now()

  try {
    const extensionMap = await importExtensions()
    await importDevices(extensionMap)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n=== Import Complete in ${elapsed}s ===`)
  } catch (error) {
    console.error('Import failed:', error)
    process.exit(1)
  }
}

main()
