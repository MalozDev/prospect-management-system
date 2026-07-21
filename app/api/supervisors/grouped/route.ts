import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { getTodayLocal } from "@/lib/time-utils";
import { Prospect } from "@/lib/models/Prospect";
import { Sale } from "@/lib/models/Sale";
import { FollowUp } from "@/lib/models/FollowUp";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user || user.role !== "SUPERADMIN") {
    return unauthorizedResponse();
  }

  try {
    await connectToDatabase();

    const today = getTodayLocal();
    const currentMonth = today.slice(0, 7);
    const ws = new Date();
    ws.setDate(ws.getDate() - 6);
    const year = ws.getFullYear();
    const month = String(ws.getMonth() + 1).padStart(2, '0');
    const day = String(ws.getDate()).padStart(2, '0');
    const weekStartIso = `${year}-${month}-${day}`;

    // Get all supervisors
    const supervisors = await User.find({ role: "SUPERVISOR" })
      .select("name cugSuffix region")
      .sort({ name: 1 })
      .lean();

    // Get all DSEs grouped by supervisor (include lastName for active tracking)
    const allDse = await User.find({ role: "DSE" })
      .select("name cugSuffix region supervisor lastLogin")
      .sort({ name: 1 })
      .lean();

    // Get all prospects and sales for stats
    const allProspects = await Prospect.find({}).lean();
    const allSales = await Sale.find({}).lean();

    // Group DSEs by supervisor
    const groups: Record<string, typeof allDse> = {};
    const unassigned: typeof allDse = [];

    for (const dse of allDse) {
      const sup = dse.supervisor || "";
      if (!sup || sup === "UNASSIGNED" || sup === "NOT_ON_BOARD") {
        unassigned.push(dse);
      } else {
        groups[sup] = groups[sup] ?? [];
        groups[sup].push(dse);
      }
    }

    // Build supervisor team data with stats
    const supervisorTeams = supervisors.map((sup) => {
      const teamDse = groups[sup.name] || [];
      const dseNames = teamDse.map((d) => d.name);

      const teamProspects = allProspects.filter((p) => dseNames.includes(p.assignedDse));
      const teamSales = allSales.filter((s) => dseNames.includes(s.soldBy));

      return {
        supervisor: {
          name: sup.name,
          cugSuffix: sup.cugSuffix,
          region: sup.region,
        },
        stats: {
          totalDse: teamDse.length,
          totalProspects: teamProspects.length,
          prospectsToday: teamProspects.filter((p) => p.createdAt === today).length,
          prospectsMonth: teamProspects.filter((p) => p.createdAt?.slice(0, 7) === currentMonth).length,
          totalSales: teamSales.length,
          salesToday: teamSales.filter((s) => s.date === today).length,
          salesWeek: teamSales.filter((s) => s.date >= weekStartIso && s.date <= today).length,
          salesMonth: teamSales.filter((s) => s.date.slice(0, 7) === currentMonth).length,
        },
        dseMembers: teamDse.map((d) => {
          const dseProspects = allProspects.filter((p) => p.assignedDse === d.name);
          const dseSales = allSales.filter((s) => s.soldBy === d.name);
          const isActive = d.lastLogin?.startsWith(today) || false;
          return {
            name: d.name,
            cugSuffix: d.cugSuffix,
            region: d.region,
            lastLogin: d.lastLogin || "",
            activeToday: isActive,
            stats: {
              prospectsToday: dseProspects.filter((p) => p.createdAt === today).length,
              prospectsMonth: dseProspects.filter((p) => p.createdAt?.slice(0, 7) === currentMonth).length,
              salesToday: dseSales.filter((s) => s.date === today).length,
              salesWeek: dseSales.filter((s) => s.date >= weekStartIso && s.date <= today).length,
              salesMonth: dseSales.filter((s) => s.date.slice(0, 7) === currentMonth).length,
            },
          };
        }),
      };
    });

    // Compute active today per team
    for (const team of supervisorTeams) {
      (team.stats as Record<string, unknown>).activeToday = team.dseMembers.filter((d) => (d as Record<string, unknown>).activeToday).length;
    }

    // Unassigned DSE stats
    const unassignedNames = unassigned.map((d) => d.name);
    const unassignedProspects = allProspects.filter((p) => unassignedNames.includes(p.assignedDse));
    const unassignedSales = allSales.filter((s) => unassignedNames.includes(s.soldBy));

    const unassignedTeam = {
      supervisor: { name: "Unassigned", cugSuffix: "", region: "" },
      stats: {
        totalDse: unassigned.length,
        totalProspects: unassignedProspects.length,
        prospectsToday: unassignedProspects.filter((p) => p.createdAt === today).length,
        prospectsMonth: unassignedProspects.filter((p) => p.createdAt?.slice(0, 7) === currentMonth).length,
        totalSales: unassignedSales.length,
        salesToday: unassignedSales.filter((s) => s.date === today).length,
        salesWeek: unassignedSales.filter((s) => s.date >= weekStartIso && s.date <= today).length,
        salesMonth: unassignedSales.filter((s) => s.date.slice(0, 7) === currentMonth).length,
        activeToday: 0,
      },
      dseMembers: unassigned.map((d) => {
        const dseProspects = allProspects.filter((p) => p.assignedDse === d.name);
        const dseSales = allSales.filter((s) => s.soldBy === d.name);
        const isActive = d.lastLogin?.startsWith(today) || false;
        return {
          name: d.name,
          cugSuffix: d.cugSuffix,
          region: d.region,
          lastLogin: d.lastLogin || "",
          activeToday: isActive,
          stats: {
            prospectsToday: dseProspects.filter((p) => p.createdAt === today).length,
            prospectsMonth: dseProspects.filter((p) => p.createdAt?.slice(0, 7) === currentMonth).length,
            salesToday: dseSales.filter((s) => s.date === today).length,
            salesWeek: dseSales.filter((s) => s.date >= weekStartIso && s.date <= today).length,
            salesMonth: dseSales.filter((s) => s.date.slice(0, 7) === currentMonth).length,
          },
        };
      }),
    };

    // Compute active today count for unassigned
    unassignedTeam.stats.activeToday = unassignedTeam.dseMembers.filter((d) => d.activeToday).length;

    return Response.json({
      teams: supervisorTeams,
      unassigned: unassignedTeam,
    });
  } catch (error) {
    console.error("Get grouped DSEs error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
