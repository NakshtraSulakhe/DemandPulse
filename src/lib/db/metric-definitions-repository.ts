import { query, queryOne } from "@/lib/db";

export interface AnalyticsMetricDefinitionRecord {
  id: string;
  metric_key: string;
  metric_version: number;
  display_name: string;
  source_system: string;
  source_field_mapping: string | null;
  aggregation_description: string | null;
  eligibility_description: string | null;
  effective_from: string;
  effective_to: string | null;
}

/**
 * Retrieves all stored metric definitions.
 */
export async function getAllMetricDefinitions(): Promise<AnalyticsMetricDefinitionRecord[]> {
  const rows = await query<any>(
    `SELECT * FROM analytics_metric_definitions ORDER BY metric_key ASC`
  );

  return rows.map((r) => ({
    id: r.id.toString(),
    metric_key: r.metric_key,
    metric_version: r.metric_version,
    display_name: r.display_name,
    source_system: r.source_system,
    source_field_mapping: r.source_field_mapping,
    aggregation_description: r.aggregation_description,
    eligibility_description: r.eligibility_description,
    effective_from: typeof r.effective_from === "string" ? r.effective_from.slice(0, 10) : new Date(r.effective_from).toISOString().slice(0, 10),
    effective_to: r.effective_to ? (typeof r.effective_to === "string" ? r.effective_to.slice(0, 10) : new Date(r.effective_to).toISOString().slice(0, 10)) : null,
  }));
}

/**
 * Retrieves a metric definition by its key.
 */
export async function getMetricDefinitionByKey(
  metricKey: string
): Promise<AnalyticsMetricDefinitionRecord | null> {
  const r = await queryOne<any>(
    `SELECT * FROM analytics_metric_definitions WHERE metric_key = ? LIMIT 1`,
    [metricKey]
  );

  if (!r) return null;

  return {
    id: r.id.toString(),
    metric_key: r.metric_key,
    metric_version: r.metric_version,
    display_name: r.display_name,
    source_system: r.source_system,
    source_field_mapping: r.source_field_mapping,
    aggregation_description: r.aggregation_description,
    eligibility_description: r.eligibility_description,
    effective_from: typeof r.effective_from === "string" ? r.effective_from.slice(0, 10) : new Date(r.effective_from).toISOString().slice(0, 10),
    effective_to: r.effective_to ? (typeof r.effective_to === "string" ? r.effective_to.slice(0, 10) : new Date(r.effective_to).toISOString().slice(0, 10)) : null,
  };
}
