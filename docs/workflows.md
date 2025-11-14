# Arela Workflows

Arela uses Windsurf's workflow system to provide repeatable, structured processes for common development tasks.

## What are Workflows?

Workflows are markdown files stored in `.windsurf/workflows/` that define a series of steps to guide Cascade through repetitive tasks. They can be invoked via slash commands in Cascade.

## Available Workflows

### `/research-driven-decision`

**Purpose:** Triggers deep research when encountering suboptimal implementations or major technical decisions.

**When to use:**
- Current implementation seems suboptimal
- Choosing between multiple algorithms/approaches
- Encountering known limitations
- Considering major architectural changes
- Evaluating new technologies

**How it works:**
1. Identifies decision point
2. Generates structured research prompt
3. User pastes into ChatGPT + Gemini
4. Reviews research together
5. Makes informed decision
6. Implements with documented rationale

**Example:** CASCADE-003 used this workflow to switch from Louvain to Infomap algorithm, resulting in successful slice detection.

## How to Use Workflows

### In Cascade

Simply type the workflow name with a slash:

```
/research-driven-decision
```

Cascade will guide you through the workflow steps.

### Creating New Workflows

1. Click **Customizations** icon in Cascade
2. Navigate to **Workflows** panel
3. Click **+ Workflow** button
4. Write your workflow in markdown

Or ask Cascade to generate one:

```
Create a workflow for [task description]
```

## Workflow Structure

```markdown
# Workflow Title

**Description:** Brief description of what this workflow does

## When to Trigger

[Conditions for using this workflow]

## Workflow Steps

### 1. Step Name

[Instructions for this step]

### 2. Next Step

[Instructions for next step]

## Benefits

[Why this workflow is valuable]

## Example

[Real-world example of workflow in action]
```

## Best Practices

### Do's
✅ Use workflows for repetitive processes
✅ Keep steps clear and actionable
✅ Include examples and context
✅ Document when to use vs when not to use
✅ Reference related Arela rules

### Don'ts
❌ Don't create workflows for one-off tasks
❌ Don't make steps too vague
❌ Don't skip the "when to trigger" section
❌ Don't exceed 12,000 character limit

## Workflow Discovery

Windsurf automatically discovers workflows from:
- `.windsurf/workflows/` in current workspace
- `.windsurf/workflows/` in sub-directories
- `.windsurf/workflows/` in parent directories (up to git root)

## Integration with Arela

Workflows complement Arela's rule system:
- **Rules** provide persistent context at the prompt level
- **Workflows** provide structured sequences at the trajectory level

Together they enable:
- Consistent decision-making processes
- Repeatable quality gates
- Knowledge sharing across team
- Continuous improvement

## Future Workflows

Planned workflows for Arela:

### `/contract-validation`
Automate OpenAPI contract validation with Dredd

### `/slice-extraction`
Guide through vertical slice extraction process

### `/architecture-review`
Run comprehensive architecture quality checks

### `/deployment-checklist`
Ensure all pre-deployment steps are complete

### `/security-scan`
Trigger security vulnerability scans

## Resources

- [Windsurf Workflows Documentation](https://docs.windsurf.com/windsurf/cascade/workflows)
- [Arela Rules Documentation](../README.md#rules)
- [Research-Driven Decision Making Workflow](../.windsurf/workflows/research-driven-decision.md)
