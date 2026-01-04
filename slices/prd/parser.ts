import matter from "gray-matter";
import {
    PRDFrontmatterSchema,
    PRDFrontmatter,
    PRDSection,
    ParsedPRD,
    UserStory
} from "./types.js";

/**
 * Parse a PRD markdown file and extract frontmatter + sections
 */
export function parsePRD(content: string, path: string = ""): ParsedPRD {
    // Parse frontmatter using gray-matter
    const { data, content: body } = matter(content);

    // Validate frontmatter with Zod
    const frontmatter = validateFrontmatter(data);

    // Extract title (first H1)
    const titleMatch = body.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : frontmatter.title || "Untitled";

    // Extract all sections
    const sections = extractSections(body);

    return {
        frontmatter,
        title,
        sections,
        raw: content,
        path,
    };
}

/**
 * Validate frontmatter against Zod schema
 */
export function validateFrontmatter(data: unknown): PRDFrontmatter {
    const result = PRDFrontmatterSchema.safeParse(data);

    if (!result.success) {
        // Return minimal valid frontmatter with error info
        console.warn("PRD frontmatter validation failed:", result.error.format());
        return {
            id: "UNKNOWN",
            type: "feature",
            status: "draft",
            priority: "medium",
            context: [],
            tools: [],
            handoff: undefined,
        };
    }

    return result.data;
}

/**
 * Extract sections from markdown body (split by ## headers)
 */
export function extractSections(body: string): PRDSection[] {
    const lines = body.split("\n");
    const sections: PRDSection[] = [];

    let currentSection: PRDSection | null = null;
    let contentLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

        if (headerMatch) {
            // Save previous section
            if (currentSection) {
                currentSection.content = contentLines.join("\n").trim();
                currentSection.lineEnd = i - 1;
                sections.push(currentSection);
            }

            // Start new section
            const level = headerMatch[1].length;
            const header = headerMatch[2].trim();

            currentSection = {
                header,
                level,
                content: "",
                lineStart: i,
                lineEnd: i,
            };
            contentLines = [];
        } else if (currentSection) {
            contentLines.push(line);
        }
    }

    // Save last section
    if (currentSection) {
        currentSection.content = contentLines.join("\n").trim();
        currentSection.lineEnd = lines.length - 1;
        sections.push(currentSection);
    }

    return sections;
}

/**
 * Extract user stories from a parsed PRD
 */
export function extractUserStories(prd: ParsedPRD): UserStory[] {
    const stories: UserStory[] = [];

    // Find all sections that start with "US-" (these are parsed as separate sections)
    const storySections = prd.sections.filter(
        s => /^US-\d+:/.test(s.header)
    );

    for (const section of storySections) {
        // Extract ID and title from section header
        const headerMatch = section.header.match(/^(US-\d+):\s*(.+)/);
        if (!headerMatch) continue;

        const id = headerMatch[1];
        const title = headerMatch[2].trim();
        const content = section.content;

        // Extract As a / I want / So that
        const asAMatch = content.match(/\*\*As a\*\*\s*(.+?)(?:,|\n)/i);
        const iWantMatch = content.match(/\*\*I want\*\*\s*(.+?)(?:,|\n)/i);
        const soThatMatch = content.match(/\*\*So that\*\*\s*(.+?)(?:\.|\n)/i);

        // Extract acceptance criteria
        const criteriaMatches = content.matchAll(/- \[[ x]\]\s*(.+)/g);
        const acceptanceCriteria = Array.from(criteriaMatches).map(m => m[1].trim());

        stories.push({
            id,
            title,
            asA: asAMatch ? asAMatch[1].trim() : "",
            iWant: iWantMatch ? iWantMatch[1].trim() : "",
            soThat: soThatMatch ? soThatMatch[1].trim() : "",
            acceptanceCriteria,
        });
    }

    return stories;
}

/**
 * Get a specific section by name
 */
export function getSection(prd: ParsedPRD, name: string): PRDSection | undefined {
    return prd.sections.find(
        s => s.header.toLowerCase().includes(name.toLowerCase())
    );
}
