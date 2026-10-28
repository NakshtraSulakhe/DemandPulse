import { prisma, serializeDbData } from "@/lib/db";

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
  const rows = await prisma.analyticsMetricDefinition.findMany({
    orderBy: { metricKey: "asc" },
  });

  return rows.map((r) => ({
    id: r.id.toString(),
    metric_key: r.metricKey,
    metric_version: r.metricVersion,
    display_name: r.displayName,
    source_system: r.sourceSystem,
    source_field_mapping: r.sourceFieldMapping,
    aggregation_description: r.aggregationDescription,
    eligibility_description: r.eligibilityDescription,
    effective_from: r.effectiveFrom.toISOString().slice(0, 10),
    effective_to: r.effectiveTo ? r.effectiveTo.toISOString().slice(0, 10) : null,
  }));
}

/**
 * Retrieves a metric definition by its key.
 */
export async function getMetricDefinitionByKey(
  metricKey: string
): Promise<AnalyticsMetricDefinitionRecord | null> {
  const r = await prisma.analyticsMetricDefinition.findUnique({
    where: { metricKey },
  });

  if (!r) return null;

  return {
    id: r.id.toString(),
    metric_key: r.metricKey,
    metric_version: r.metricVersion,
    display_name: r.displayName,
    source_system: r.sourceSystem,
    source_field_mapping: r.sourceFieldMapping,
    aggregation_description: r.aggregationDescription,
    eligibility_description: r.eligibilityDescription,
    effective_from: r.effectiveFrom.toISOString().slice(0, 10),
    effective_to: r.effectiveTo ? r.effectiveTo.toISOString().slice(0, 10) : null,
  };
}
