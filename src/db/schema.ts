import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  boolean,
  decimal,
  date,
  timestamp,
  jsonb,
  primaryKey,
  index,
  unique,
} from 'drizzle-orm/pg-core'

// ============================================
// EXTENSIONS
// ============================================

export const extensions = pgTable(
  'extensions',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    dateAdded: date('date_added'),
    hasFeatures: boolean('has_features').default(false),
    hasProperties: boolean('has_properties').default(false),
  },
  (table) => [index('idx_extensions_name').on(table.name)]
)

// Pre-computed coverage per platform (fast lookups)
export const extensionCoverage = pgTable(
  'extension_coverage',
  {
    id: serial('id').primaryKey(),
    extensionId: integer('extension_id')
      .notNull()
      .references(() => extensions.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(), // 'all', 'windows', 'linux', 'android', 'macos', 'ios'
    coveragePercent: decimal('coverage_percent', { precision: 5, scale: 2 }).notNull(),
    deviceCount: integer('device_count').default(0),
    totalDevices: integer('total_devices').default(0),
  },
  (table) => [
    unique('uq_extension_platform').on(table.extensionId, table.platform),
    index('idx_coverage_platform').on(table.platform),
    index('idx_coverage_extension').on(table.extensionId),
  ]
)

// ============================================
// DEVICES
// ============================================

export const devices = pgTable(
  'devices',
  {
    id: serial('id').primaryKey(),
    reportId: integer('report_id').unique(),
    deviceName: text('device_name').notNull(),
    vendorId: integer('vendor_id'),
    deviceId: bigint('device_id', { mode: 'number' }),
    deviceType: text('device_type'), // 'INTEGRATED_GPU', 'DISCRETE_GPU', 'VIRTUAL_GPU', 'CPU'
    apiVersion: text('api_version'), // '1.4.318'
    apiVersionRaw: integer('api_version_raw'),
    driverVersion: text('driver_version'),
    driverVersionRaw: bigint('driver_version_raw', { mode: 'number' }),
    platform: text('platform').notNull(), // 'windows', 'linux', 'android', 'macos', 'ios'
    osName: text('os_name'),
    osVersion: text('os_version'),
    architecture: text('architecture'),
    submitter: text('submitter'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('idx_devices_platform').on(table.platform),
    index('idx_devices_vendor').on(table.vendorId),
    index('idx_devices_name').on(table.deviceName),
    index('idx_devices_report').on(table.reportId),
  ]
)

// Which extensions each device supports
export const deviceExtensions = pgTable(
  'device_extensions',
  {
    deviceId: integer('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    extensionId: integer('extension_id')
      .notNull()
      .references(() => extensions.id, { onDelete: 'cascade' }),
    specVersion: integer('spec_version'),
  },
  (table) => [
    primaryKey({ columns: [table.deviceId, table.extensionId] }),
    index('idx_device_ext_device').on(table.deviceId),
    index('idx_device_ext_extension').on(table.extensionId),
  ]
)

// ============================================
// DEVICE FEATURES & PROPERTIES
// ============================================

// Core Vulkan features (1.1, 1.2, 1.3, 1.4)
export const deviceCoreFeatures = pgTable(
  'device_core_features',
  {
    id: serial('id').primaryKey(),
    deviceId: integer('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    coreVersion: text('core_version').notNull(), // 'core11', 'core12', 'core13', 'core14'
    features: jsonb('features').notNull(), // {multiview: true, shaderDrawParameters: true, ...}
  },
  (table) => [
    unique('uq_device_core_version').on(table.deviceId, table.coreVersion),
    index('idx_core_features_device').on(table.deviceId),
  ]
)

// Core Vulkan properties (1.1, 1.2, 1.3, 1.4)
export const deviceCoreProperties = pgTable(
  'device_core_properties',
  {
    id: serial('id').primaryKey(),
    deviceId: integer('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    coreVersion: text('core_version').notNull(),
    properties: jsonb('properties').notNull(),
  },
  (table) => [
    unique('uq_device_core_props_version').on(table.deviceId, table.coreVersion),
    index('idx_core_props_device').on(table.deviceId),
  ]
)

// Device limits (maxComputeWorkGroupSize, etc.)
export const deviceLimits = pgTable('device_limits', {
  deviceId: integer('device_id')
    .primaryKey()
    .references(() => devices.id, { onDelete: 'cascade' }),
  limits: jsonb('limits').notNull(),
  sparseProperties: jsonb('sparse_properties'),
  subgroupProperties: jsonb('subgroup_properties'),
})

// Extended features (per-extension features like VK_EXT_transform_feedback)
export const deviceExtendedFeatures = pgTable(
  'device_extended_features',
  {
    id: serial('id').primaryKey(),
    deviceId: integer('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    extensionName: text('extension_name').notNull(),
    featureName: text('feature_name').notNull(),
    supported: boolean('supported').notNull(),
  },
  (table) => [
    unique('uq_device_ext_feature').on(table.deviceId, table.extensionName, table.featureName),
    index('idx_ext_features_device').on(table.deviceId),
    index('idx_ext_features_extension').on(table.extensionName),
  ]
)

// Extended properties (per-extension properties)
export const deviceExtendedProperties = pgTable(
  'device_extended_properties',
  {
    id: serial('id').primaryKey(),
    deviceId: integer('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    extensionName: text('extension_name').notNull(),
    propertyName: text('property_name').notNull(),
    value: jsonb('value'), // Can be string, number, boolean, array, object
  },
  (table) => [
    unique('uq_device_ext_prop').on(table.deviceId, table.extensionName, table.propertyName),
    index('idx_ext_props_device').on(table.deviceId),
    index('idx_ext_props_extension').on(table.extensionName),
  ]
)

// ============================================
// METADATA
// ============================================

export const scrapeMeta = pgTable('scrape_meta', {
  id: serial('id').primaryKey(),
  scrapeDate: timestamp('scrape_date').notNull(),
  totalExtensions: integer('total_extensions'),
  totalReports: integer('total_reports'),
  source: text('source'),
  license: text('license'),
})

// ============================================
// TYPE EXPORTS
// ============================================

export type Extension = typeof extensions.$inferSelect
export type NewExtension = typeof extensions.$inferInsert

export type ExtensionCoverage = typeof extensionCoverage.$inferSelect
export type NewExtensionCoverage = typeof extensionCoverage.$inferInsert

export type Device = typeof devices.$inferSelect
export type NewDevice = typeof devices.$inferInsert

export type DeviceExtension = typeof deviceExtensions.$inferSelect
export type NewDeviceExtension = typeof deviceExtensions.$inferInsert
