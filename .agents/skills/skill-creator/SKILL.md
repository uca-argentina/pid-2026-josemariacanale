---
name: skill-creator
description: Author, refine, and audit agent skills following Matt Pocock's methodology and Antigravity standards. Use when creating new skills, writing or editing SKILL.md files, converting workflows into skills, or auditing skills for progressive disclosure, leading words, completion criteria, and context load.
---

# Skill Creator

Guide and reference for authoring and auditing agent skills using Matt Pocock's design principles adapted for the Antigravity skill architecture.

A skill is not a general prompt or a sprawling manual; it is an executable, composable unit of engineering discipline designed to keep the agent in an observable, high-rigor loop.

---

## The Core Levers

Every skill is shaped by four design levers:

1. **The Two Loads**: Balance **Context Load** (tokens kept permanently in the agent's window) against **Cognitive Load** (the mental index the human must maintain).
2. **Information Hierarchy**: Organize knowledge into **In-file Steps**, **In-file Reference**, and **Disclosed Reference** (`references/` subfolder).
3. **Leading Words**: Recruit pretrained model behaviors using dense conceptual anchors (*tight*, *red*, *seam*, *tracer bullet*, *deep module*) rather than verbose multi-sentence descriptions.
4. **Completion Criteria**: Prevent premature completion with unambiguous, checkable, and exhaustive completion bounds for every step.

---

## Workflow: Authoring a New Skill

When designing or revising a skill, work through these sequential phases:

```
[Phase 1: Invocation Decision] 
       ↓
[Phase 2: Vocabulary & Leading Words]
       ↓
[Phase 3: Information Hierarchy]
       ↓
[Phase 4: Completion Criteria & Steps]
       ↓
[Phase 5: File & Directory Scaffolding]
       ↓
[Phase 6: Pruning & No-Op Audit]
```

### Phase 1: Invocation Decision

Determine who can reach the skill:

| Mode | Trigger | Context Load | Cognitive Load | Frontmatter Configuration |
| :--- | :--- | :--- | :--- | :--- |
| **Model-invoked** | Agent fires automatically or user types name | Permanent (description is always indexed in context) | Low (agent discovers it when relevant) | Omit `disable-model-invocation`. Description contains rich trigger phrasing ("Use when..."). |
| **User-invoked** | Human explicitly executes slash command / name | Zero (description not exposed to autonomous model triggers) | High (user must remember it exists) | Set `disable-model-invocation: true`. Description is a concise 1-line human summary. |

> Consult [`references/skill-mechanics.md`](./references/skill-mechanics.md) for router skills, dependency chaining, and metadata.

### Phase 2: Vocabulary & Leading Words

Identify the core abstractions the skill thinks with:
- **Anchor pretrained concepts**: Replace multi-sentence explanations with dense tokens:
  - "fast, deterministic, low-overhead loop" → *tight* loop
  - "failing automated test that proves the bug" → *red* test
  - "clean abstraction boundary between components" → *seam*
  - "thin end-to-end slice touching all layers" → *tracer bullet*
  - "small interface hiding rich behavior" → *deep module*
- **Prompt the positive**: Steer with clear target actions rather than prohibitions. Never say "Don't write untested code"; state "Write a red test before modifying implementation". Prohibitions drag the forbidden action into context.

> Consult [`references/leading-words.md`](./references/leading-words.md) for the complete dictionary of leading words and phrasing techniques.

### Phase 3: Information Hierarchy & Progressive Disclosure

Do not cram every edge case or manual into `SKILL.md`. Allocate content across the hierarchy ladder:

1. **In-file Steps** (Top tier): The primary sequence of actions the agent executes in order.
2. **In-file Reference** (Middle tier): Co-located definitions, rules, or tables consulted immediately on demand.
3. **Disclosed Reference** (Ground tier): Bulky manuals, schemas, long templates, or domain deep-dives pushed to `references/` or `resources/`. Reached only via context pointers when needed.

**The Disclosure Test**: If an explanation is only relevant to one specific branch or edge-case, push it behind a pointer in `references/`. Keep in `SKILL.md` only what every run requires.

### Phase 4: Steps & Completion Criteria

Draft the execution sequence:
- **Guard against premature completion**: An agent tends to rush toward being "done". Define unambiguous completion criteria for every step:
  - ❌ *Weak bound*: "Understand the architecture."
  - ✅ *Checkable bound*: "Document all public methods, input parameters, and failure modes in a table."
- **Demand and legwork**: The criterion must force the requisite investigation before moving to the next step.

### Phase 5: File & Directory Scaffolding

Place the skill inside the workspace customization root (`.agents/skills/<skill-name>/`):

```text
.agents/skills/<skill-name>/
├── SKILL.md                  # Main entry point with frontmatter & steps
├── references/               # Disclosed reference docs loaded on-demand
│   ├── rules.md
│   └── domain-notes.md
├── scripts/                  # (Optional) Executable scripts & validation helpers
└── examples/                 # (Optional) Concrete reference implementations
```

Write the `SKILL.md` frontmatter:
```yaml
---
name: <kebab-case-name>
description: <Trigger-rich description if model-invoked, or concise summary if user-invoked>
# disable-model-invocation: true  # (Only if user-invoked)
---
```

### Phase 6: Pruning & No-Op Audit

Run the pruning sweep before committing the skill:
- **The No-Op Test**: Read each sentence. Would the base model already perform this action by default? If yes, delete the sentence.
- **The Cache Test**: Does this instruction repeat information readily available in the environment (`package.json`, directory structure, `--help` output)? Leave the lookup to the environment; cache only unwritten conventions or hidden gotchas.
- **Single Source of Truth**: Ensure no rule or definition is duplicated across multiple sections or files.

---

## Verification & Audit Checklist

Before releasing a skill, run through [`references/checklist.md`](./references/checklist.md):
- [ ] Frontmatter includes `name` and appropriate `description`.
- [ ] Invocation mode matches the intended context budget.
- [ ] All step transitions have checkable completion criteria.
- [ ] No negative prompts ("Don't..."); all instructions are positive and actionable.
- [ ] Bulky references are moved to `references/` with clickable file links.
- [ ] No redundant text or model default behaviors (no-op free).
