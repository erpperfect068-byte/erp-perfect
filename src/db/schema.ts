import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, uuid, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// 0. Roles & Permissions Tables
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  module: text('module').notNull(),
  labelAr: text('label_ar').notNull(),
  descriptionAr: text('description_ar'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionCode: text('permission_code').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 1. Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').notNull().default('data_entry'), // admin, accountant, clearance_officer, data_entry
  roleId: uuid('role_id').references(() => roles.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 2. Clients Table
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  taxNumber: text('tax_number'),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
});

// 3. Client Items Table
export const clientItems = pgTable('client_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // Specific customs item description
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
});

// 4. Client Pricing Table
export const clientPricing = pgTable('client_pricing', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  serviceName: text('service_name').notNull(), // Service/Fee type
  price: numeric('price', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('EGP'), // EGP, USD, EUR
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
});

// 5. Ports Table
export const ports = pgTable('ports', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(), // Sokhna, Alexandria, etc.
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 6. Agencies Table
export const agencies = pgTable('agencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 7. Contractors Table
export const contractors = pgTable('contractors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 8. Statuses Table
export const statuses = pgTable('statuses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#6b7280'), // Hex color
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 9. Shipments Table
export const shipments = pgTable('shipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  clientItemId: uuid('client_item_id').references(() => clientItems.id),
  invoiceValue: numeric('invoice_value', { precision: 18, scale: 2 }),
  invoiceNumber: text('invoice_number'),
  supplierName: text('supplier_name'),
  acid: text('acid'), // ACID Number (cargo tracking)
  declarationNumber46: text('declaration_number_46'), // Custom Declaration No. 46
  containerCount: integer('container_count'),
  bolNumber: text('bol_number'), // Bill of Lading Number
  arrivalDate: timestamp('arrival_date', { withTimezone: true }),
  documentReceiptDate: timestamp('document_receipt_date', { withTimezone: true }),
  portId: uuid('port_id').references(() => ports.id),
  statusId: uuid('status_id').references(() => statuses.id),
  contractorId: uuid('contractor_id').references(() => contractors.id),
  agencyId: uuid('agency_id').references(() => agencies.id),
  currency: text('currency').notNull().default('USD'), // USD, EUR, EGP
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
});

// 10. Statements Table (Accounting Invoice)
export const statements = pgTable('statements', {
  id: uuid('id').primaryKey().defaultRandom(),
  shipmentId: uuid('shipment_id').notNull().unique().references(() => shipments.id, { onDelete: 'cascade' }),
  statementDate: timestamp('statement_date', { withTimezone: true }).notNull().defaultNow(),
  currency: text('currency').notNull().default('EGP'),
  totalAmount: numeric('total_amount', { precision: 18, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
});

// 11. Statement Items Table
export const statementItems = pgTable('statement_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  statementId: uuid('statement_id').notNull().references(() => statements.id, { onDelete: 'cascade' }),
  itemType: text('item_type').notNull(), // expense, fee, deposit_deduction, reversal
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('EGP'),
  exchangeRateAtTransaction: numeric('exchange_rate_at_transaction', { precision: 18, scale: 4 }).notNull().default('1.0000'),
  percentage: numeric('percentage', { precision: 5, scale: 2 }), // If applicable
  externalReceiptNumber: text('external_receipt_number'), // To merge/group items
  attachmentPath: text('attachment_path'), // Storage path for receipt/invoice scan
  isReversed: boolean('is_reversed').notNull().default(false),
  reversedByItemId: uuid('reversed_by_item_id'), // Reference to the reversing item
  reversalReason: text('reversal_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
});

// 12. Client Deposits Table
export const clientDeposits = pgTable('client_deposits', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  statementId: uuid('statement_id').references(() => statements.id), // If general, statementId is null
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('EGP'),
  exchangeRateAtTransaction: numeric('exchange_rate_at_transaction', { precision: 18, scale: 4 }).notNull().default('1.0000'),
  depositDate: timestamp('deposit_date', { withTimezone: true }).notNull().defaultNow(),
  receiptNumber: text('receipt_number'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
});

// 13. Treasuries Table (Multiple Safes / Accounts)
export const treasuries = pgTable('treasuries', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id'),
  name: text('name').notNull(),
  code: text('code'),
  type: text('type').notNull().default('cash'), // cash, bank
  isMain: boolean('is_main').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
});

// 14. Treasury Transactions Table (Cash / Bank Movements)
export const treasuryTransactions = pgTable('treasury_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id'),
  treasuryId: uuid('treasury_id').references(() => treasuries.id),
  statementId: uuid('statement_id').references(() => statements.id),
  clientId: uuid('client_id').references(() => clients.id),
  transactionType: text('transaction_type').notNull(), // deposit, withdraw, transfer_out, transfer_in, reversal, adjustment_in, adjustment_out
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('EGP'),
  exchangeRateAtTransaction: numeric('exchange_rate_at_transaction', { precision: 18, scale: 4 }).notNull().default('1.0000'),
  transactionDate: timestamp('transaction_date', { withTimezone: true }).notNull().defaultNow(),
  referenceNumber: text('reference_number'),
  transferGroupId: uuid('transfer_group_id'),
  relatedTreasuryId: uuid('related_treasury_id').references(() => treasuries.id),
  isReversed: boolean('is_reversed').notNull().default(false),
  reversedByTransactionId: uuid('reversed_by_transaction_id'),
  reversalReason: text('reversal_reason'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => [
  check(
    'treasury_transactions_transaction_type_check',
    sql`${table.transactionType} IN ('deposit', 'withdraw', 'transfer_out', 'transfer_in', 'reversal', 'adjustment_in', 'adjustment_out')`
  ),
]);

// 14. Audit Log Table
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  action: text('action').notNull(), // INSERT, UPDATE, DELETE
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  changedBy: uuid('changed_by').references(() => users.id),
  changedByEmail: text('changed_by_email'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 15. Auth Events Table
export const authEvents = pgTable('auth_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  userEmail: text('user_email'),
  eventType: text('event_type').notNull(), // login, logout, login_failed
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 16. User Invitations Table
export const userInvitations = pgTable('user_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('data_entry'),
  invitedBy: text('invited_by'), // Email or name of who invited them
  invitedByEmail: text('invited_by_email'),
  status: text('status').notNull().default('pending'), // pending, accepted, expired
  invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

// 17. Employee Custodies Table
export const employeeCustodies = pgTable('employee_custodies', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id'),
  employeeId: uuid('employee_id').references(() => users.id),
  treasuryId: uuid('treasury_id').references(() => treasuries.id),
  treasuryTransactionId: uuid('treasury_transaction_id').references(() => treasuryTransactions.id),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('EGP'),
  status: text('status').notNull().default('open'), // open, closed
  issuedDate: timestamp('issued_date', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  closedBy: uuid('closed_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
});

// 18. Custody Expenses Table
export const custodyExpenses = pgTable('custody_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id'),
  custodyId: uuid('custody_id').notNull().references(() => employeeCustodies.id, { onDelete: 'cascade' }),
  shipmentId: uuid('shipment_id').references(() => shipments.id),
  expenseType: text('expense_type').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('EGP'),
  description: text('description').notNull(),
  receiptNumber: text('receipt_number'),
  expenseDate: timestamp('expense_date', { withTimezone: true }).notNull().defaultNow(),
  isReversed: boolean('is_reversed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
});

// Relations Definitions
export const usersRelations = relations(users, ({ many }) => ({
  clientsCreated: many(clients, { relationName: 'clientsCreated' }),
  clientsUpdated: many(clients, { relationName: 'clientsUpdated' }),
  shipmentsCreated: many(shipments, { relationName: 'shipmentsCreated' }),
  shipmentsUpdated: many(shipments, { relationName: 'shipmentsUpdated' }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  items: many(clientItems),
  pricing: many(clientPricing),
  shipments: many(shipments),
  deposits: many(clientDeposits),
}));

export const clientItemsRelations = relations(clientItems, ({ one }) => ({
  client: one(clients, {
    fields: [clientItems.clientId],
    references: [clients.id],
  }),
}));

export const clientPricingRelations = relations(clientPricing, ({ one }) => ({
  client: one(clients, {
    fields: [clientPricing.clientId],
    references: [clients.id],
  }),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  client: one(clients, {
    fields: [shipments.clientId],
    references: [clients.id],
  }),
  clientItem: one(clientItems, {
    fields: [shipments.clientItemId],
    references: [clientItems.id],
  }),
  port: one(ports, {
    fields: [shipments.portId],
    references: [ports.id],
  }),
  status: one(statuses, {
    fields: [shipments.statusId],
    references: [statuses.id],
  }),
  contractor: one(contractors, {
    fields: [shipments.contractorId],
    references: [contractors.id],
  }),
  agency: one(agencies, {
    fields: [shipments.agencyId],
    references: [agencies.id],
  }),
  statement: one(statements, {
    fields: [shipments.id],
    references: [statements.shipmentId],
  }),
}));

export const statementsRelations = relations(statements, ({ one, many }) => ({
  shipment: one(shipments, {
    fields: [statements.shipmentId],
    references: [shipments.id],
  }),
  items: many(statementItems),
  deposits: many(clientDeposits),
}));

export const statementItemsRelations = relations(statementItems, ({ one }) => ({
  statement: one(statements, {
    fields: [statementItems.statementId],
    references: [statements.id],
  }),
}));

export const clientDepositsRelations = relations(clientDeposits, ({ one }) => ({
  client: one(clients, {
    fields: [clientDeposits.clientId],
    references: [clients.id],
  }),
  statement: one(statements, {
    fields: [clientDeposits.statementId],
    references: [statements.id],
  }),
}));
