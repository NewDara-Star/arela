export type SchemaChangeType = "removed-field" | "changed-type";

export interface SchemaChange {
  type: SchemaChangeType;
  field: string;
  oldValue: string;
  newValue: string;
  severity: "critical" | "major" | "minor";
}

/**
 * Compare two schemas and capture breaking field-level changes.
 */
export function compareSchemas(
  current: SchemaObject | undefined,
  previous: SchemaObject | undefined,
  parentField = ""
): SchemaChange[] {
  const changes: SchemaChange[] = [];

  if (!previous) {
    return changes;
  }

  const currentSchema = current ?? {};
  const previousSchema = previous ?? {};

  // Missing required fields are breaking changes
  const previousRequired = previousSchema.required ?? [];
  const currentRequired = new Set(currentSchema.required ?? []);

  for (const field of previousRequired) {
    if (!currentRequired.has(field)) {
      const fieldName = joinField(parentField, field);
      changes.push({
        type: "removed-field",
        field: fieldName,
        oldValue: "required",
        newValue: "optional or missing",
        severity: "major",
      });
    }
  }

  const previousProps = previousSchema.properties ?? {};
  const currentProps = currentSchema.properties ?? {};

  for (const [prop, previousPropSchema] of Object.entries(previousProps)) {
    const fieldName = joinField(parentField, prop);
    const currentPropSchema = currentProps[prop];

    if (!currentPropSchema) {
      changes.push({
        type: "removed-field",
        field: fieldName,
        oldValue: describeSchema(previousPropSchema as SchemaObject),
        newValue: "removed",
        severity: "major",
      });
      continue;
    }

    const previousType = resolveType(previousPropSchema as SchemaObject);
    const currentType = resolveType(currentPropSchema);

    if (previousType && currentType && previousType !== currentType) {
      changes.push({
        type: "changed-type",
        field: fieldName,
        oldValue: previousType,
        newValue: currentType,
        severity: "major",
      });
    }

    if (previousType === "object" || (previousPropSchema as any).properties || (previousPropSchema as any).required) {
      changes.push(...compareSchemas(currentPropSchema, previousPropSchema as SchemaObject, fieldName));
      continue;
    }

    if (previousType === "array" && (previousPropSchema as any).items) {
      const nextCurrent = currentPropSchema.items;
      const nextPrevious = (previousPropSchema as any).items;
      changes.push(...compareSchemas(nextCurrent, nextPrevious, `${fieldName}[]`));
    }
  }

  return changes;
}

export type SchemaObject = Record<string, any>;

export function resolveType(schema?: SchemaObject): string | undefined {
  if (!schema) {
    return undefined;
  }

  if (typeof schema.type === "string") {
    return schema.type;
  }

  if (Array.isArray(schema.type) && schema.type.length > 0) {
    return schema.type.join(" | ");
  }

  if (schema.$ref) {
    return schema.$ref;
  }

  if (schema.enum) {
    return "enum";
  }

  return undefined;
}

export function describeSchema(schema?: SchemaObject): string {
  return resolveType(schema) ?? "unknown";
}

function joinField(parent: string, child: string): string {
  return parent ? `${parent}.${child}` : child;
}
