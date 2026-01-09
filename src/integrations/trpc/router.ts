import { z } from 'zod'
import { eq, desc, asc, sql, and, ilike } from 'drizzle-orm'

import { createTRPCRouter, publicProcedure } from './init'
import { getDb, extensions, extensionCoverage, devices, deviceExtensions } from '@/db'

import type { TRPCRouterRecord } from '@trpc/server'

// Platform enum for validation
const platformSchema = z.enum(['all', 'windows', 'linux', 'android', 'macos', 'ios'])

const extensionsRouter = {
  // List all extensions with coverage for a platform
  list: publicProcedure
    .input(
      z.object({
        platform: platformSchema.default('all'),
        search: z.string().optional(),
        sortBy: z.enum(['name', 'coverage', 'date']).default('coverage'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = getDb()
      const { platform, search, sortBy, sortOrder, limit, offset } = input

      // Build the query
      const query = db
        .select({
          id: extensions.id,
          name: extensions.name,
          dateAdded: extensions.dateAdded,
          hasFeatures: extensions.hasFeatures,
          hasProperties: extensions.hasProperties,
          coveragePercent: extensionCoverage.coveragePercent,
          deviceCount: extensionCoverage.deviceCount,
          totalDevices: extensionCoverage.totalDevices,
        })
        .from(extensions)
        .leftJoin(
          extensionCoverage,
          and(
            eq(extensionCoverage.extensionId, extensions.id),
            eq(extensionCoverage.platform, platform)
          )
        )

      // Add search filter if provided
      const conditions = search ? ilike(extensions.name, `%${search}%`) : undefined

      // Determine sort column
      const sortColumn =
        sortBy === 'name'
          ? extensions.name
          : sortBy === 'date'
            ? extensions.dateAdded
            : extensionCoverage.coveragePercent

      const sortFn = sortOrder === 'asc' ? asc : desc

      const results = await query
        .where(conditions)
        .orderBy(sortFn(sortColumn))
        .limit(limit)
        .offset(offset)

      // Get total count for pagination
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(extensions)
        .where(conditions)

      return {
        extensions: results,
        total: Number(countResult[0]?.count || 0),
        limit,
        offset,
      }
    }),

  // Get a single extension by name
  byName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const db = getDb()

      const result = await db
        .select()
        .from(extensions)
        .where(eq(extensions.name, input.name))
        .limit(1)

      if (!result[0]) {
        return null
      }

      // Get coverage for all platforms
      const coverage = await db
        .select()
        .from(extensionCoverage)
        .where(eq(extensionCoverage.extensionId, result[0].id))

      return {
        ...result[0],
        coverage,
      }
    }),

  // Get coverage stats (for summary cards)
  stats: publicProcedure.query(async () => {
    const db = getDb()

    const [extCount, deviceCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(extensions),
      db.select({ count: sql<number>`count(*)` }).from(devices),
    ])

    return {
      totalExtensions: Number(extCount[0]?.count || 0),
      totalDevices: Number(deviceCount[0]?.count || 0),
    }
  }),
} satisfies TRPCRouterRecord

const devicesRouter = {
  // List devices with pagination
  list: publicProcedure
    .input(
      z.object({
        platform: platformSchema.optional(),
        search: z.string().optional(),
        vendorId: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = getDb()
      const { platform, search, vendorId, limit, offset } = input

      const conditions = []
      if (platform && platform !== 'all') {
        conditions.push(eq(devices.platform, platform))
      }
      if (search) {
        conditions.push(ilike(devices.deviceName, `%${search}%`))
      }
      if (vendorId) {
        conditions.push(eq(devices.vendorId, vendorId))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const results = await db
        .select()
        .from(devices)
        .where(whereClause)
        .orderBy(desc(devices.id))
        .limit(limit)
        .offset(offset)

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(devices)
        .where(whereClause)

      return {
        devices: results,
        total: Number(countResult[0]?.count || 0),
        limit,
        offset,
      }
    }),

  // Get devices supporting a specific extension
  byExtension: publicProcedure
    .input(
      z.object({
        extensionName: z.string(),
        platform: platformSchema.optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = getDb()
      const { extensionName, platform, limit, offset } = input

      // First get the extension ID
      const ext = await db
        .select({ id: extensions.id })
        .from(extensions)
        .where(eq(extensions.name, extensionName))
        .limit(1)

      if (!ext[0]) {
        return { devices: [], total: 0, limit, offset }
      }

      const conditions = [eq(deviceExtensions.extensionId, ext[0].id)]
      if (platform && platform !== 'all') {
        conditions.push(eq(devices.platform, platform))
      }

      const results = await db
        .select({
          id: devices.id,
          deviceName: devices.deviceName,
          vendorId: devices.vendorId,
          platform: devices.platform,
          apiVersion: devices.apiVersion,
          driverVersion: devices.driverVersion,
        })
        .from(deviceExtensions)
        .innerJoin(devices, eq(deviceExtensions.deviceId, devices.id))
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(deviceExtensions)
        .innerJoin(devices, eq(deviceExtensions.deviceId, devices.id))
        .where(and(...conditions))

      return {
        devices: results,
        total: Number(countResult[0]?.count || 0),
        limit,
        offset,
      }
    }),
} satisfies TRPCRouterRecord

export const trpcRouter = createTRPCRouter({
  extensions: extensionsRouter,
  devices: devicesRouter,
})

export type TRPCRouter = typeof trpcRouter
