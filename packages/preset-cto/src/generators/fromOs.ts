import { ArelaRule } from "../schema.js";

const DEFAULT_VERSION = "1.0.0";

function buildRule(id: string, title: string, body: string, tags?: string[]): ArelaRule {
  return {
    id,
    title,
    version: DEFAULT_VERSION,
    tags,
    body,
  };
}

export function emitRulesFromOs(os: any): ArelaRule[] {
  const rules: ArelaRule[] = [];
  if (!os || typeof os !== "object") {
    return rules;
  }

  if (os.contextIntegrityDirective) {
    rules.push(
      buildRule(
        "arela.context_integrity",
        "Context Integrity Protocol",
        String(os.contextIntegrityDirective),
        ["process"],
      ),
    );
  }

  if (os.engineeringTicketSchema) {
    rules.push(
      buildRule(
        "arela.ticket_format",
        "Engineering Ticket Format",
        String(os.engineeringTicketSchema),
        ["execution"],
      ),
    );
  }

  if (os.testingPhilosophy) {
    rules.push(
      buildRule(
        "arela.testing_pyramid",
        "Testing Pyramid Minimums",
        String(os.testingPhilosophy),
        ["qa"],
      ),
    );
  }

  return rules;
}
