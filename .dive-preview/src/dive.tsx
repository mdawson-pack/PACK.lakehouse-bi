import { useState } from "react";
import { useSQLQuery } from "@motherduck/react-sql-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

const N = (v: unknown): number => (v != null ? Number(v) : 0);

const STAGE_COLORS: Record<string, string> = {
  Qualify: "#0777b3",
  Propose: "#e18727",
  Close:   "#2d7a00",
};

const OWNERS = ["All", "Corey Leinen", "Eric Wieland", "Elling Olson", "Jeff Battles", "Mariah Groll", "Helen Martinez", "Luke Janecek"];

function fmt$(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function ownerClause(owner: string): string {
  return owner === "All" ? "" : `AND Owner = '${owner.replace("'", "''")}'`;
}

export default function CRMOpportunitiesDive() {
  const [selectedOwner, setSelectedOwner] = useState("All");

  const where = ownerClause(selectedOwner);

  // KPIs
  const kpiQuery = useSQLQuery(`
    SELECT
      COUNT(*) as total_opps,
      SUM(TRY_CAST("Estimated Revenue" AS DOUBLE)) as pipeline_value,
      AVG(TRY_CAST("Estimated Revenue" AS DOUBLE)) as avg_deal,
      COUNT(DISTINCT Owner) as owner_count
    FROM "my_db"."main"."opportunities"
    WHERE 1=1 ${where}
  `);

  // Pipeline by Stage
  const stageQuery = useSQLQuery(`
    SELECT
      Stage,
      COUNT(*) as opps,
      SUM(TRY_CAST("Estimated Revenue" AS DOUBLE)) as value
    FROM "my_db"."main"."opportunities"
    WHERE Stage IS NOT NULL ${where}
    GROUP BY Stage
    ORDER BY value DESC
  `);

  // Pipeline by Owner
  const ownerQuery = useSQLQuery(`
    SELECT
      Owner,
      COUNT(*) as opps,
      SUM(TRY_CAST("Estimated Revenue" AS DOUBLE)) as value
    FROM "my_db"."main"."opportunities"
    WHERE Owner IS NOT NULL ${where}
    GROUP BY Owner
    ORDER BY value DESC
  `);

  // Opportunities table
  const tableQuery = useSQLQuery(`
    SELECT
      "Opportunity Name",
      "Customer Name",
      Stage,
      TRY_CAST("Estimated Revenue" AS DOUBLE) as revenue,
      "Estimated Close Date",
      Owner
    FROM "my_db"."main"."opportunities"
    WHERE 1=1 ${where}
    ORDER BY TRY_CAST("Estimated Revenue" AS DOUBLE) DESC NULLS LAST
    LIMIT 10
  `);

  const kpiRows = Array.isArray(kpiQuery.data) ? kpiQuery.data : [];
  const kpi = kpiRows[0];

  const stageData = (Array.isArray(stageQuery.data) ? stageQuery.data : []).map(r => ({
    stage: r.Stage as string,
    value: N(r.value),
    opps: N(r.opps),
  }));

  const ownerData = (Array.isArray(ownerQuery.data) ? ownerQuery.data : []).map(r => ({
    owner: (r.Owner as string)?.split(" ")[0] ?? r.Owner as string,
    fullName: r.Owner as string,
    value: N(r.value),
    opps: N(r.opps),
  }));

  const tableRows = Array.isArray(tableQuery.data) ? tableQuery.data : [];

  return (
    <div className="p-6" style={{ background: "#f8f8f8", minHeight: "100vh" }}>
      {/* Header + Owner slicer */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#231f20" }}>CRM Opportunities</h1>
          <p className="text-sm mt-0.5" style={{ color: "#6a6a6a" }}>Pipeline overview · all stages</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-xs font-semibold uppercase" style={{ color: "#6a6a6a", letterSpacing: "0.06em" }}>Owner</span>
          {OWNERS.map((o) => (
            <button
              key={o}
              onClick={() => setSelectedOwner(o)}
              style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 20,
                border: selectedOwner === o ? "1.5px solid #0777b3" : "1px solid #d1d5db",
                background: selectedOwner === o ? "#0777b3" : "transparent",
                color: selectedOwner === o ? "#fff" : "#6a6a6a",
                cursor: "pointer", fontWeight: selectedOwner === o ? 600 : 400,
                whiteSpace: "nowrap",
              }}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-8 mb-8">
        {[
          { label: "Pipeline Value", val: kpiQuery.isLoading ? null : fmt$(N(kpi?.pipeline_value)) },
          { label: "Opportunities",  val: kpiQuery.isLoading ? null : N(kpi?.total_opps).toLocaleString() },
          { label: "Avg Deal Size",  val: kpiQuery.isLoading ? null : fmt$(N(kpi?.avg_deal)) },
          { label: "Owners",         val: kpiQuery.isLoading ? null : String(N(kpi?.owner_count)) },
        ].map(({ label, val }) => (
          <div key={label}>
            {val == null ? (
              <div className="h-12 w-24 bg-gray-200 animate-pulse rounded" />
            ) : (
              <p className="text-5xl font-bold" style={{ color: "#231f20" }}>{val}</p>
            )}
            <p className="text-sm mt-2" style={{ color: "#6a6a6a" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Pipeline by Stage */}
        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: "#231f20" }}>Pipeline by Stage</p>
          {stageQuery.isLoading ? (
            <div className="bg-gray-100 animate-pulse rounded" style={{ height: 220 }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stageData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => fmt$(v)} fontSize={10} style={{ fill: "#6a6a6a" }} />
                <YAxis type="category" dataKey="stage" width={55} fontSize={11} style={{ fill: "#6a6a6a" }} />
                <Tooltip formatter={(v: number) => [fmt$(v), "Pipeline"]} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {stageData.map((entry) => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? "#adadad"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pipeline by Owner */}
        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: "#231f20" }}>Pipeline by Owner</p>
          {ownerQuery.isLoading ? (
            <div className="bg-gray-100 animate-pulse rounded" style={{ height: 220 }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ownerData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => fmt$(v)} fontSize={10} style={{ fill: "#6a6a6a" }} />
                <YAxis type="category" dataKey="owner" width={55} fontSize={11} style={{ fill: "#6a6a6a" }} />
                <Tooltip formatter={(v: number, _: string, props: { payload?: { fullName?: string } }) => [fmt$(v), props.payload?.fullName ?? ""]} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" fill="#0777b3" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Opportunities table */}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "#231f20" }}>
          Top Opportunities{selectedOwner !== "All" ? ` · ${selectedOwner}` : ""}
        </p>
        {tableQuery.isLoading ? (
          <div className="animate-pulse space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-200 rounded" />)}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Opportunity", "Customer", "Stage", "Est. Revenue", "Close Date", "Owner"].map((h) => (
                  <th key={h} style={{
                    fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
                    color: "#6a6a6a", padding: "6px 10px", textAlign: "left",
                    borderBottom: "1px solid #e5e7eb",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "7px 10px", color: "#231f20", fontWeight: 500 }}>{row["Opportunity Name"] as string}</td>
                  <td style={{ padding: "7px 10px", color: "#6a6a6a" }}>{row["Customer Name"] as string}</td>
                  <td style={{ padding: "7px 10px" }}>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                      background: STAGE_COLORS[row.Stage as string] ?? "#adadad",
                      color: "#fff",
                    }}>
                      {row.Stage as string}
                    </span>
                  </td>
                  <td style={{ padding: "7px 10px", color: "#231f20", fontFamily: "monospace" }}>
                    {row.revenue != null ? fmt$(N(row.revenue)) : "—"}
                  </td>
                  <td style={{ padding: "7px 10px", color: "#6a6a6a" }}>
                    {row["Estimated Close Date"]
                      ? (row["Estimated Close Date"] as string).slice(0, 10)
                      : "—"}
                  </td>
                  <td style={{ padding: "7px 10px", color: "#6a6a6a" }}>{row.Owner as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
