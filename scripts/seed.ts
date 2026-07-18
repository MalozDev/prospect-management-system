/**
 * Database seed script
 * 
 * Run: npx tsx scripts/seed.ts
 * 
 * This creates initial users and sample data so the app is usable immediately
 * after deployment. Set MONGODB_URI env var before running.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/prospect-management";

interface SeedUser {
  name: string;
  cugSuffix: string;
  password: string;
  role: "DSE" | "SUPERVISOR";
  region: string;
  supervisor?: string;
}

interface SeedProspect {
  name: string;
  phone: string;
  location: string;
  address: string;
  expectedPurchaseDate: string;
  status: string;
  assignedDse: string;
  notes: string;
}

interface SeedSale {
  customer: string;
  packageName: string;
  amount: number;
  soldBy: string;
  date: string;
}

const SUPERVISORS: SeedUser[] = [
  { name: "Grace Mulenga", cugSuffix: "8888", password: "password123", role: "SUPERVISOR", region: "Copperbelt" },
  { name: "Peter Banda", cugSuffix: "7777", password: "password123", role: "SUPERVISOR", region: "Lusaka" },
  { name: "Abigail Tembo", cugSuffix: "6666", password: "password123", role: "SUPERVISOR", region: "Kitwe" },
];

const DSES: SeedUser[] = [
  { name: "Nalu Mwansa", cugSuffix: "2288", password: "password123", role: "DSE", region: "Lusaka", supervisor: "Grace Mulenga" },
  { name: "Tebo Chanda", cugSuffix: "3344", password: "password123", role: "DSE", region: "Kitwe", supervisor: "Grace Mulenga" },
  { name: "Moses Phiri", cugSuffix: "1122", password: "password123", role: "DSE", region: "Lusaka", supervisor: "Peter Banda" },
  { name: "Chanda Bwalya", cugSuffix: "5566", password: "password123", role: "DSE", region: "Ndola", supervisor: "Grace Mulenga" },
  { name: "Mutale Kangwa", cugSuffix: "9900", password: "password123", role: "DSE", region: "Lusaka", supervisor: "Peter Banda" },
];

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

const SAMPLE_PROSPECTS: SeedProspect[] = [
  { name: "Moses Chanda", phone: "+260976123456", location: "Lusaka", address: "Cairo Road", expectedPurchaseDate: today, status: "NEW", assignedDse: "Nalu Mwansa", notes: "Interested in ODU package" },
  { name: "Martha Banda", phone: "+260977456789", location: "Kitwe", address: "Freedom Park", expectedPurchaseDate: tomorrow, status: "NEW", assignedDse: "Tebo Chanda", notes: "Follow up on pricing" },
  { name: "Charles Musonda", phone: "+260966777888", location: "Ndola", address: "President Ave", expectedPurchaseDate: today, status: "CONTACTED", assignedDse: "Nalu Mwansa", notes: "Called - interested" },
  { name: "Lydia Ngoma", phone: "+260953444555", location: "Lusaka", address: "Manda Hill", expectedPurchaseDate: nextWeek, status: "NEW", assignedDse: "Moses Phiri", notes: "Referral from existing customer" },
  { name: "Ruth Mweemba", phone: "+260979222333", location: "Kitwe", address: "Chisokone Market", expectedPurchaseDate: today, status: "POSTPONED", assignedDse: "Tebo Chanda", notes: "Postponed - call again" },
  { name: "Brian Mulenga", phone: "+260955111222", location: "Lusaka", address: "Ibex Hill", expectedPurchaseDate: today, status: "NEW", assignedDse: "Nalu Mwansa", notes: "New lead from expo" },
  { name: "Grace Simukoko", phone: "+260958222111", location: "Ndola", address: "Main Street", expectedPurchaseDate: nextWeek, status: "NEW", assignedDse: "Chanda Bwalya", notes: "" },
  { name: "Martin Lupiya", phone: "+260965333222", location: "Lusaka", address: "Kabulonga", expectedPurchaseDate: nextWeek, status: "CONTACTED", assignedDse: "Moses Phiri", notes: "Sent pricing info" },
  { name: "Nancy Mumba", phone: "+260974444555", location: "Kitwe", address: "Nkana East", expectedPurchaseDate: tomorrow, status: "NEW", assignedDse: "Tebo Chanda", notes: "" },
  { name: "Peter Sakala", phone: "+260977666777", location: "Lusaka", address: "Chelston", expectedPurchaseDate: today, status: "NEW", assignedDse: "Mutale Kangwa", notes: "Walk-in customer" },
];

const SAMPLE_SALES: SeedSale[] = [
  { customer: "Alice Banda", packageName: "ODU", amount: 200, soldBy: "Nalu Mwansa", date: today },
  { customer: "Bob Kasonde", packageName: "ODU", amount: 200, soldBy: "Tebo Chanda", date: yesterday() },
  { customer: "Catherine Zulu", packageName: "ODU", amount: 200, soldBy: "Nalu Mwansa", date: yesterday() },
  { customer: "David Phiri", packageName: "ODU", amount: 200, soldBy: "Moses Phiri", date: thisWeek(3) },
  { customer: "Evelyn Mwila", packageName: "ODU", amount: 200, soldBy: "Nalu Mwansa", date: thisWeek(5) },
  { customer: "Francis Ngoma", packageName: "ODU", amount: 200, soldBy: "Tebo Chanda", date: thisWeek(2) },
];

function yesterday() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

function thisWeek(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
}

async function seed() {
  console.log(`\n  🌱 Seeding database: ${MONGODB_URI}\n`);

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  // Get collections
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name);

  // Clear existing data
  for (const name of ["users", "prospects", "followups", "sales", "notifications", "activities"]) {
    if (collectionNames.includes(name)) {
      await db.collection(name).deleteMany({});
      console.log(`  ✨ Cleared ${name}`);
    }
  }

  // Create supervisors
  for (const sup of SUPERVISORS) {
    const hashedPassword = await bcrypt.hash(sup.password, 10);
    const result = await db.collection("users").insertOne({
      name: sup.name,
      cugSuffix: sup.cugSuffix,
      password: hashedPassword,
      role: sup.role,
      region: sup.region,
      supervisor: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  👤 Supervisor: ${sup.name} (CUG: 097898${sup.cugSuffix})`);
  }

  // Create DSEs
  for (const dse of DSES) {
    const hashedPassword = await bcrypt.hash(dse.password, 10);
    await db.collection("users").insertOne({
      name: dse.name,
      cugSuffix: dse.cugSuffix,
      password: hashedPassword,
      role: dse.role,
      region: dse.region,
      supervisor: dse.supervisor || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  👤 DSE: ${dse.name} (CUG: 097898${dse.cugSuffix})`);
  }

  // Create prospects and follow-ups
  for (const prospect of SAMPLE_PROSPECTS) {
    const prospectResult = await db.collection("prospects").insertOne({
      name: prospect.name,
      phone: prospect.phone,
      location: prospect.location,
      address: prospect.address,
      expectedPurchaseDate: prospect.expectedPurchaseDate,
      createdAt: today,
      status: prospect.status,
      assignedDse: prospect.assignedDse,
      notes: prospect.notes,
      createdAt_ts: new Date(),
      updatedAt: new Date(),
    });

    // Create linked follow-up
    const computedStatus = prospect.expectedPurchaseDate === today
      ? "TODAY"
      : prospect.expectedPurchaseDate < today
      ? "OVERDUE"
      : "UPCOMING";

    await db.collection("followups").insertOne({
      customerName: prospect.name,
      phone: prospect.phone,
      expectedPurchaseDate: prospect.expectedPurchaseDate,
      status: computedStatus,
      category: "CALL",
      isFirstFollowUp: true,
      lastContacted: prospect.status === "CONTACTED" ? today : "",
      assignedDse: prospect.assignedDse,
      outcome: "",
      prospectId: String(prospectResult.insertedId),
      visitDate: "",
      notes: prospect.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  📋 Prospect: ${prospect.name} (${prospect.expectedPurchaseDate}) → Follow-up created`);
  }

  // Create sales
  for (const sale of SAMPLE_SALES) {
    await db.collection("sales").insertOne({
      customer: sale.customer,
      packageName: sale.packageName,
      amount: sale.amount,
      soldBy: sale.soldBy,
      date: sale.date,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  💰 Sale: ${sale.customer} (K${sale.amount}) - ${sale.soldBy}`);
  }

  // Create some activity entries
  const activities = [
    { title: "Prospect created", detail: "Moses Chanda added as a new prospect", type: "prospect" },
    { title: "Sale completed", detail: "ODU sale closed for Alice Banda", type: "sale" },
    { title: "Visit scheduled", detail: "Site visit scheduled for Martha Banda", type: "visit" },
  ];

  for (const activity of activities) {
    await db.collection("activities").insertOne({
      title: activity.title,
      detail: activity.detail,
      time: "Just now",
      type: activity.type,
      userId: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log(`\n  ✅ Seed complete!\n`);
  console.log(`  ┌──────────────────────────────────────┐`);
  console.log(`  │         Login Credentials            │`);
  console.log(`  ├──────────────────────────────────────┤`);
  console.log(`  │ SUPERVISORS                          │`);
  console.log(`  │   Grace Mulenga → CUG: 8888         │`);
  console.log(`  │   Peter Banda   → CUG: 7777         │`);
  console.log(`  │   Abigail Tembo → CUG: 6666         │`);
  console.log(`  ├──────────────────────────────────────┤`);
  console.log(`  │ DSEs                                 │`);
  console.log(`  │   Nalu Mwansa  → CUG: 2288          │`);
  console.log(`  │   Tebo Chanda  → CUG: 3344          │`);
  console.log(`  │   Moses Phiri  → CUG: 1122          │`);
  console.log(`  │   Chanda Bwalya→ CUG: 5566          │`);
  console.log(`  │   Mutale Kangwa→ CUG: 9900          │`);
  console.log(`  ├──────────────────────────────────────┤`);
  console.log(`  │ Password for all: password123        │`);
  console.log(`  └──────────────────────────────────────┘\n`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
