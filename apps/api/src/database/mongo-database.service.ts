import { Injectable, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { ClientSession, Connection, Model } from "mongoose";
import { createMongoModels, type RepositoryName } from "./mongo.schemas";
import { MongoDatabaseKnownRequestError } from "./domain.types";

type Relation = { target: RepositoryName; sourceField: string; targetField: string; many: boolean };
type RelationRegistry = Partial<Record<RepositoryName, Record<string, Relation>>>;

const relations: RelationRegistry = {};
function relation(source: RepositoryName, name: string, target: RepositoryName, sourceField: string, inverse: string, inverseMany = true): void {
  (relations[source] ??= {})[name] = { target, sourceField, targetField: "_id", many: false };
  (relations[target] ??= {})[inverse] = { target: source, sourceField: "_id", targetField: sourceField, many: inverseMany };
}

relation("verificationOtp", "user", "user", "userId", "verificationOtps");
relation("passwordResetToken", "user", "user", "userId", "passwordResetTokens");
relation("customerProfile", "user", "user", "userId", "customerProfile", false);
relation("vendor", "user", "user", "userId", "vendor", false);
relation("vendorDocument", "vendor", "vendor", "vendorId", "documents");
relation("vendorDocument", "verifiedBy", "user", "verifiedById", "documentsVerified");
relation("vendorInspection", "vendor", "vendor", "vendorId", "inspections");
relation("vendorInspection", "inspector", "user", "inspectorId", "inspectionsAssigned");
relation("vendorBankAccount", "vendor", "vendor", "vendorId", "bankAccounts");
relation("vendorStatusHistory", "vendor", "vendor", "vendorId", "statusHistory");
relation("category", "parent", "category", "parentId", "children");
relation("product", "vendor", "vendor", "vendorId", "products");
relation("product", "category", "category", "categoryId", "products");
relation("productImage", "product", "product", "productId", "images");
relation("inventory", "product", "product", "productId", "inventory", false);
relation("inventoryTransaction", "inventory", "inventory", "inventoryId", "transactions");
relation("address", "customer", "customerProfile", "customerId", "addresses");
relation("cart", "customer", "customerProfile", "customerId", "cart", false);
relation("cartItem", "cart", "cart", "cartId", "items");
relation("cartItem", "product", "product", "productId", "cartItems");
relation("checkoutQuote", "customer", "customerProfile", "customerId", "checkoutQuotes");
relation("checkoutQuote", "address", "address", "addressId", "checkoutQuotes");
relation("masterOrder", "customer", "customerProfile", "customerId", "orders");
relation("masterOrder", "checkoutQuote", "checkoutQuote", "checkoutQuoteId", "masterOrder", false);
relation("masterOrder", "deliveryAddress", "address", "deliveryAddressId", "orders");
relation("vendorOrder", "masterOrder", "masterOrder", "masterOrderId", "vendorOrders");
relation("vendorOrder", "vendor", "vendor", "vendorId", "vendorOrders");
relation("orderItem", "vendorOrder", "vendorOrder", "vendorOrderId", "items");
relation("orderItem", "product", "product", "productId", "orderItems");
relation("payment", "masterOrder", "masterOrder", "masterOrderId", "payments");
relation("shipment", "vendorOrder", "vendorOrder", "vendorOrderId", "shipment", false);
relation("commissionRule", "category", "category", "categoryId", "commissionRules");
relation("commissionTransaction", "vendor", "vendor", "vendorId", "commissionTransactions");
relation("commissionTransaction", "vendorOrder", "vendorOrder", "vendorOrderId", "commissions");
relation("commissionTransaction", "orderItem", "orderItem", "orderItemId", "commission", false);
relation("commissionTransaction", "rule", "commissionRule", "ruleId", "transactions");
relation("vendorLedger", "vendor", "vendor", "vendorId", "ledgerEntries");
relation("vendorLedger", "vendorOrder", "vendorOrder", "vendorOrderId", "ledgerEntries");
relation("settlement", "vendor", "vendor", "vendorId", "settlements");
relation("settlementItem", "settlement", "settlement", "settlementId", "items");
relation("settlementItem", "vendorOrder", "vendorOrder", "vendorOrderId", "settlementItems", false);
relation("refund", "masterOrder", "masterOrder", "masterOrderId", "refunds");
relation("refund", "vendorOrder", "vendorOrder", "vendorOrderId", "refunds");
relation("refund", "orderItem", "orderItem", "orderItemId", "refunds");
relation("refund", "payment", "payment", "paymentId", "refunds");
relation("returnRequest", "orderItem", "orderItem", "orderItemId", "returnRequest", false);
relation("returnRequest", "customer", "customerProfile", "customerId", "returnRequests");
relation("replacement", "orderItem", "orderItem", "orderItemId", "replacement", false);
relation("review", "customer", "customerProfile", "customerId", "reviews");
relation("review", "product", "product", "productId", "reviews");
relation("review", "orderItem", "orderItem", "orderItemId", "review", false);
relation("complaint", "customer", "customerProfile", "customerId", "complaints");
relation("complaint", "masterOrder", "masterOrder", "masterOrderId", "complaints");
relation("complaint", "vendorOrder", "vendorOrder", "vendorOrderId", "complaints");
relation("complaint", "orderItem", "orderItem", "orderItemId", "complaints");
relation("complaint", "vendor", "vendor", "vendorId", "complaints");
relation("complaint", "shipment", "shipment", "shipmentId", "complaints");
relation("complaintMessage", "complaint", "complaint", "complaintId", "messages");
relation("auditLog", "actor", "user", "actorId", "auditLogs");
relation("integrationSetting", "updatedBy", "user", "updatedById", "integrationSettingsUpdated");
relation("session", "user", "user", "userId", "sessions");
relation("complaintAttachment", "complaint", "complaint", "complaintId", "attachmentRecords");
relation("vendorInvoice", "vendorOrder", "vendorOrder", "vendorOrderId", "vendorInvoice", false);
relation("commissionInvoice", "vendorOrder", "vendorOrder", "vendorOrderId", "commissionInvoice", false);

function plain(value: any): any {
  if (value == null) return value;
  const result = typeof value.toObject === "function" ? value.toObject({ virtuals: false }) : structuredClone(value);
  if (result._id != null) { result.id = String(result._id); delete result._id; }
  for (const [key, nested] of Object.entries(result)) {
    if (nested && typeof nested === "object" && (nested as { _bsontype?: string })._bsontype === "Decimal128") result[key] = Number((nested as { toString(): string }).toString());
    else if (nested && typeof nested === "object" && "$numberDecimal" in (nested)) result[key] = Number((nested as { $numberDecimal: string }).$numberDecimal);
    else if (Array.isArray(nested)) result[key] = nested.map(plain);
  }
  return result;
}

function scalarFilter(value: any): any {
  if (value == null || value instanceof Date || typeof value !== "object" || Array.isArray(value)) return value;
  const operators: Record<string, string> = { in: "$in", notIn: "$nin", lt: "$lt", lte: "$lte", gt: "$gt", gte: "$gte" };
  const output: Record<string, any> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (key === "equals") return nested;
    if (key === "not") output.$ne = nested;
    else if (key === "contains") output.$regex = new RegExp(String(nested).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), value.mode === "insensitive" ? "i" : "");
    else if (key === "startsWith") output.$regex = new RegExp(`^${String(nested)}`, value.mode === "insensitive" ? "i" : "");
    else if (key === "endsWith") output.$regex = new RegExp(`${String(nested)}$`, value.mode === "insensitive" ? "i" : "");
    else if (operators[key]) output[operators[key]] = nested;
  }
  return Object.keys(output).length ? output : value;
}

export class MongoRepository {
  constructor(private readonly database: MongoDatabaseService, private readonly name: RepositoryName, private readonly session?: ClientSession) {}
  private get model(): Model<any> { return this.database.models[this.name]; }

  private async where(input: any = {}): Promise<any> {
    const output: Record<string, any> = {};
    for (const [rawKey, rawValue] of Object.entries(input ?? {})) {
      if (["AND", "OR", "NOT"].includes(rawKey)) {
        const values = Array.isArray(rawValue) ? rawValue : [rawValue];
        output[rawKey === "AND" ? "$and" : rawKey === "OR" ? "$or" : "$nor"] = await Promise.all(values.map((value: any) => this.where(value)));
        continue;
      }
      if (rawKey.includes("_") && rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
        const compound = await this.where(rawValue);
        if (Object.keys(compound).every((key) => !key.startsWith("$"))) {
          Object.assign(output, compound);
          continue;
        }
      }
      const relationInfo = relations[this.name]?.[rawKey];
      if (relationInfo && rawValue && typeof rawValue === "object") {
        const relationFilter = rawValue as any;
        const exclude = "none" in relationFilter || "isNot" in relationFilter;
        const condition = relationFilter.some ?? relationFilter.none ?? relationFilter.is ?? relationFilter.isNot ?? rawValue;
        const targetWhere = await this.database.repository(relationInfo.target, this.session).where(condition);
        if (relationInfo.sourceField === "_id") {
          const matches = await this.database.models[relationInfo.target].find(targetWhere, { [relationInfo.targetField]: 1 }).session(this.session ?? null).lean();
          output._id = { [exclude ? "$nin" : "$in"]: matches.map((item: any) => item[relationInfo.targetField]).filter(Boolean) };
        } else {
          const matches = await this.database.models[relationInfo.target].find(targetWhere, { _id: 1 }).session(this.session ?? null).lean();
          output[relationInfo.sourceField] = { [exclude ? "$nin" : "$in"]: matches.map((item: any) => String(item._id)) };
        }
        continue;
      }
      output[rawKey === "id" ? "_id" : rawKey] = scalarFilter(rawValue);
    }
    return output;
  }

  private async hydrateOne(document: any, shape: any): Promise<any> {
    if (!document) return document;
    const result = plain(document);
    const requested = { ...(shape?.include ?? {}), ...Object.fromEntries(Object.entries(shape?.select ?? {}).filter(([, value]) => typeof value === "object")) };
    for (const [field, config] of Object.entries(requested)) {
      if (!config) continue;
      if (field === "_count") {
        const selections = (config as any).select ?? {};
        result._count = {};
        for (const [relationName, enabled] of Object.entries(selections)) {
          if (!enabled) continue;
          const countRelation = relations[this.name]?.[relationName];
          if (!countRelation) continue;
          const countOptions = enabled === true ? {} : enabled as any;
          const countWhere = countRelation.sourceField === "_id"
            ? { [countRelation.targetField]: result.id }
            : { id: result[countRelation.sourceField] };
          result._count[relationName] = countRelation.many
            ? await this.database.repository(countRelation.target, this.session).count({ where: { ...(countOptions.where ?? {}), ...countWhere } })
            : Number(Boolean(await this.database.repository(countRelation.target, this.session).findFirst({ where: { ...(countOptions.where ?? {}), ...countWhere } })));
        }
        continue;
      }
      const info = relations[this.name]?.[field];
      if (!info) continue;
      const options = config === true ? {} : config as any;
      const repository = this.database.repository(info.target, this.session);
      const relationWhere = info.sourceField === "_id" ? { [info.targetField]: result.id } : { id: result[info.sourceField] };
      result[field] = info.many
        ? await repository.findMany({ ...options, where: { ...(options.where ?? {}), ...relationWhere } })
        : await repository.findFirst({ ...options, where: { ...(options.where ?? {}), ...relationWhere } });
    }
    if (shape?.select) {
      const selected: Record<string, any> = {};
      for (const [field, enabled] of Object.entries(shape.select)) if (enabled) selected[field] = result[field];
      return selected;
    }
    return result;
  }

  async findUnique(args: any): Promise<any> { return this.findFirst(args); }
  async findUniqueOrThrow(args: any): Promise<any> { const item = await this.findFirst(args); if (!item) throw new MongoDatabaseKnownRequestError("P2025"); return item; }
  async findFirst(args: any = {}): Promise<any> {
    let query = this.model.findOne(await this.where(args.where)).session(this.session ?? null);
    if (args.orderBy) query = query.sort(this.database.sort(args.orderBy));
    return this.hydrateOne(await query.lean(), args);
  }
  async findMany(args: any = {}): Promise<any[]> {
    let query = this.model.find(await this.where(args.where)).session(this.session ?? null);
    const orderItems = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
    const relationCountOrder = orderItems
      .filter(Boolean)
      .flatMap((item: any) => Object.entries(item))
      .find((entry: [string, unknown]) => {
        const direction = entry[1];
        return Boolean(direction && typeof direction === "object" && "_count" in direction);
      });
    if (args.orderBy && !relationCountOrder) query = query.sort(this.database.sort(args.orderBy));
    if (args.skip && !relationCountOrder) query = query.skip(args.skip);
    if (args.take && !relationCountOrder) query = query.limit(args.take);
    const items = await query.lean();
    const hydrated = await Promise.all(items.map((item: any) => this.hydrateOne(item, args)));
    if (!relationCountOrder) return hydrated;
    const [relationName, direction] = relationCountOrder as [string, { _count: "asc" | "desc" }];
    const countRelation = relations[this.name]?.[relationName];
    if (!countRelation) return hydrated.slice(args.skip ?? 0, args.take ? (args.skip ?? 0) + args.take : undefined);
    const sortCounts = await Promise.all(items.map(async (item: any) => {
      const source = plain(item);
      const countWhere = countRelation.sourceField === "_id"
        ? { [countRelation.targetField]: source.id }
        : { id: source[countRelation.sourceField] };
      return countRelation.many
        ? this.database.repository(countRelation.target, this.session).count({ where: countWhere })
        : Number(Boolean(await this.database.repository(countRelation.target, this.session).findFirst({ where: countWhere })));
    }));
    const ranked = hydrated.map((item: any, index: number) => ({ item, count: sortCounts[index] }));
    ranked.sort((left, right) => {
      const difference = left.count - right.count;
      return direction._count === "desc" ? -difference : difference;
    });
    return ranked.map(({ item }) => item).slice(args.skip ?? 0, args.take ? (args.skip ?? 0) + args.take : undefined);
  }
  async count(args: any = {}): Promise<number> { return this.model.countDocuments(await this.where(args.where)).session(this.session ?? null); }

  private writeData(data: any): Record<string, any> {
    const output: Record<string, any> = {};
    for (const [key, value] of Object.entries(data ?? {})) {
      const info = relations[this.name]?.[key];
      if (info) {
        if (value && typeof value === "object" && info.sourceField !== "_id") {
          const connect = (value as any).connect;
          if (connect) output[info.sourceField] = connect.id ?? connect._id;
        }
        continue;
      }
      if (key === "id") output._id = value;
      else output[key] = value;
    }
    return output;
  }

  private updateData(data: any): any {
    const update: Record<string, any> = { $set: {}, $inc: {}, $unset: {} };
    for (const [key, value] of Object.entries(this.writeData(data))) {
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        if ("increment" in value) update.$inc[key] = (value).increment;
        else if ("decrement" in value) update.$inc[key] = -(value).decrement;
        else if ("set" in value) update.$set[key] = (value).set;
        else update.$set[key] = value;
      } else if (value === undefined) continue;
      else if (value === null) update.$set[key] = null;
      else update.$set[key] = value;
    }
    for (const operator of ["$set", "$inc", "$unset"]) if (!Object.keys(update[operator]).length) delete update[operator];
    return update;
  }

  async create(args: any): Promise<any> {
    try {
      const document = await this.model.create([{ ...this.writeData(args.data) }], { session: this.session });
      const root = plain(document[0]);
      for (const [field, value] of Object.entries(args.data ?? {})) {
        const info = relations[this.name]?.[field];
        if (!info || info.sourceField !== "_id" || !value || typeof value !== "object") continue;
        const nested = (value as any).create;
        const rows = Array.isArray(nested) ? nested : nested ? [nested] : [];
        for (const row of rows) {
          await this.database.repository(info.target, this.session).create({ data: { ...row, [info.targetField]: root.id } });
        }
      }
      return this.hydrateOne(document[0], args);
    } catch (error: any) { throw this.database.translate(error); }
  }
  async createMany(args: any): Promise<{ count: number }> {
    try { const items = await this.model.insertMany((args.data ?? []).map((item: any) => this.writeData(item)), { session: this.session, ordered: args.skipDuplicates !== true }); return { count: items.length }; }
    catch (error: any) { if (args.skipDuplicates && error?.code === 11000) return { count: error.insertedDocs?.length ?? 0 }; throw this.database.translate(error); }
  }
  async update(args: any): Promise<any> {
    try { const document = await this.model.findOneAndUpdate(await this.where(args.where), this.updateData(args.data), { new: true, runValidators: true, session: this.session }).lean(); if (!document) throw new MongoDatabaseKnownRequestError("P2025"); return this.hydrateOne(document, args); }
    catch (error: any) { throw this.database.translate(error); }
  }
  async updateMany(args: any): Promise<{ count: number }> { const result = await this.model.updateMany(await this.where(args.where), this.updateData(args.data), { session: this.session }); return { count: result.modifiedCount }; }
  async delete(args: any): Promise<any> { const document = await this.model.findOneAndDelete(await this.where(args.where), { session: this.session }).lean(); if (!document) throw new MongoDatabaseKnownRequestError("P2025"); return plain(document); }
  async deleteMany(args: any = {}): Promise<{ count: number }> { const result = await this.model.deleteMany(await this.where(args.where), { session: this.session }); return { count: result.deletedCount }; }
  async upsert(args: any): Promise<any> {
    const where = await this.where(args.where);
    const update = this.updateData(args.update);
    update.$setOnInsert = { ...this.writeData(args.create), ...Object.fromEntries(Object.entries(where).filter(([, value]) => typeof value !== "object")) };
    try { return this.hydrateOne(await this.model.findOneAndUpdate(where, update, { new: true, upsert: true, setDefaultsOnInsert: true, session: this.session }).lean(), args); }
    catch (error: any) { throw this.database.translate(error); }
  }
  async aggregate(args: any): Promise<any> {
    const match = await this.where(args.where);
    const fields = Object.keys(args._sum ?? {});
    const group: Record<string, any> = { _id: null, ...(args._count ? { _count: { $sum: 1 } } : {}) };
    for (const field of fields) group[field] = { $sum: `$${field}` };
    const rows = await this.model.aggregate([{ $match: match }, { $group: group }]).session(this.session ?? null);
    return {
      _sum: Object.fromEntries(fields.map((field: any) => [field, rows[0]?.[field] == null ? null : Number(rows[0][field])])),
      ...(args._count ? { _count: rows[0]?._count ?? 0 } : {}),
    };
  }
  async groupBy(args: any): Promise<any[]> {
    const by: string[] = args.by ?? [];
    const countFields = Object.keys(args._count ?? {});
    const averageFields = Object.keys(args._avg ?? {});
    const sumFields = Object.keys(args._sum ?? {});
    const group: Record<string, any> = { _id: Object.fromEntries(by.map((field: any) => [field, `$${field}`])) };
    for (const field of countFields) group[`count_${field}`] = { $sum: { $cond: [{ $ne: [`$${field}`, null] }, 1, 0] } };
    for (const field of averageFields) group[`average_${field}`] = { $avg: `$${field}` };
    for (const field of sumFields) group[`sum_${field}`] = { $sum: `$${field}` };
    const rows = await this.model.aggregate([{ $match: await this.where(args.where) }, { $group: group }]).session(this.session ?? null);
    return rows.map((row: any) => ({
      ...row._id,
      ...(countFields.length ? { _count: Object.fromEntries(countFields.map((field) => [field, row[`count_${field}`] ?? 0])) } : {}),
      ...(averageFields.length ? { _avg: Object.fromEntries(averageFields.map((field) => [field, row[`average_${field}`] == null ? null : Number(row[`average_${field}`])])) } : {}),
      ...(sumFields.length ? { _sum: Object.fromEntries(sumFields.map((field) => [field, row[`sum_${field}`] == null ? null : Number(row[`sum_${field}`])])) } : {}),
    }));
  }
}

@Injectable()
export class MongoDatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly models: Record<RepositoryName, Model<any>>;
  [key: string]: any;
  declare readonly user: MongoRepository;
  declare readonly verificationOtp: MongoRepository;
  declare readonly passwordResetToken: MongoRepository;
  declare readonly customerProfile: MongoRepository;
  declare readonly vendor: MongoRepository;
  declare readonly vendorDocument: MongoRepository;
  declare readonly vendorInspection: MongoRepository;
  declare readonly vendorBankAccount: MongoRepository;
  declare readonly vendorStatusHistory: MongoRepository;
  declare readonly category: MongoRepository;
  declare readonly homeHeroSlide: MongoRepository;
  declare readonly product: MongoRepository;
  declare readonly productImage: MongoRepository;
  declare readonly inventory: MongoRepository;
  declare readonly inventoryTransaction: MongoRepository;
  declare readonly address: MongoRepository;
  declare readonly cart: MongoRepository;
  declare readonly cartItem: MongoRepository;
  declare readonly checkoutQuote: MongoRepository;
  declare readonly masterOrder: MongoRepository;
  declare readonly vendorOrder: MongoRepository;
  declare readonly orderItem: MongoRepository;
  declare readonly payment: MongoRepository;
  declare readonly shipment: MongoRepository;
  declare readonly commissionRule: MongoRepository;
  declare readonly commissionTransaction: MongoRepository;
  declare readonly vendorLedger: MongoRepository;
  declare readonly settlement: MongoRepository;
  declare readonly settlementItem: MongoRepository;
  declare readonly refund: MongoRepository;
  declare readonly returnRequest: MongoRepository;
  declare readonly replacement: MongoRepository;
  declare readonly review: MongoRepository;
  declare readonly complaint: MongoRepository;
  declare readonly complaintMessage: MongoRepository;
  declare readonly notification: MongoRepository;
  declare readonly auditLog: MongoRepository;
  declare readonly integrationSetting: MongoRepository;
  declare readonly providerEvent: MongoRepository;
  declare readonly session: MongoRepository;
  declare readonly complaintAttachment: MongoRepository;
  declare readonly vendorInvoice: MongoRepository;
  declare readonly commissionInvoice: MongoRepository;
  constructor(@InjectConnection() readonly connection: Connection, @Optional() private readonly transactionSession?: ClientSession) {
    this.models = createMongoModels(connection);
    for (const name of Object.keys(this.models) as RepositoryName[]) this[name] = this.repository(name, transactionSession);
  }
  async onModuleInit(): Promise<void> { await Promise.all(Object.values(this.models).map((model: any) => model.createIndexes())); }
  async onModuleDestroy(): Promise<void> { if (Number(this.connection.readyState) !== 0) await this.connection.close(); }
  repository(name: RepositoryName, session = this.transactionSession): MongoRepository { return new MongoRepository(this, name, session); }
  sort(orderBy: any): Record<string, 1 | -1> { const items = Array.isArray(orderBy) ? orderBy : [orderBy]; return Object.fromEntries(items.flatMap((item: any) => Object.entries(item ?? {}).map(([field, direction]) => [field === "id" ? "_id" : field, direction === "desc" ? -1 : 1]))); }
  translate(error: any): Error { if (error instanceof MongoDatabaseKnownRequestError) return error; if (error?.code === 11000) return new MongoDatabaseKnownRequestError("P2002", { target: Object.keys(error.keyPattern ?? {}) }); return error; }
  async transaction(
    input: (database: MongoDatabaseService) => Promise<any>,
    options?: { timeout?: number },
  ): Promise<any> {
    const session = await this.connection.startSession();
    try {
      let result: any;
      await session.withTransaction(
        async () => { result = await input(new MongoDatabaseService(this.connection, session)); },
        options?.timeout ? { maxCommitTimeMS: options.timeout } : undefined,
      );
      return result;
    }
    finally { await session.endSession(); }
  }
}
