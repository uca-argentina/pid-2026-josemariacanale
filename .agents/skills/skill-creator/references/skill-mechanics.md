# Skill Mechanics

Technical reference for skill frontmatter, invocation choices, context pointers, and router design following Matt Pocock's conventions.

---

## 1. Invocation Mechanics: Model vs. User Invoked

The primary architectural decision for any skill is deciding who is allowed to reach it.

### Model-Invoked Skills
- **Definition**: Reachable either by the autonomous model decision or by the user typing the command.
- **Context Load Cost**: High. The `description` field is permanently indexed in the model's system context window across every turn.
- **Frontmatter**:
  ```yaml
  ---
  name: diagnosing-bugs
  description: Diagnosing hard bugs, unexpected regressions, and test flakes. Use when the user encounters failing tests, race conditions, or unhandled exceptions that resist a first-pass fix.
  ---
  ```
- **Description Rules**:
  - Must use third-person perspective.
  - Must state **what** the skill does and **when** (trigger conditions and symptoms).
  - Front-load the leading word or action trigger.
  - Collapse synonyms: do not repeat three versions of the same trigger branch.

### User-Invoked Skills
- **Definition**: Reachable **only** by the human explicitly requesting it (e.g. `/my-skill`).
- **Context Load Cost**: Zero. The model does not see the description or skill trigger until manually invoked.
- **Cognitive Load Cost**: High. The human acts as the index and must remember that the skill exists.
- **Frontmatter**:
  ```yaml
  ---
  name: feature-planner
  description: Plan complex cross-module features and generate tracer-bullet implementation tickets.
  disable-model-invocation: true
  ---
  ```
- **Description Rules**:
  - Keep it as a concise, 1-line human-facing summary.
  - Strip model trigger phrases ("Use when the user asks...").

---

## 2. Invocation Rule of Thumb

- **Make it Model-Invoked when**: The agent should reliably detect and execute this discipline on its own without user intervention (e.g. `tdd`, `code-review`, `diagnosing-bugs`).
- **Make it User-Invoked when**: The skill orchestrates major decisions, alters the workflow structure, or runs high-friction human-in-the-loop interactions (e.g. `grill-me`, `wayfinder`, `triage`, `handoff`).

---

## 3. Router Skills

When user-invoked skills multiply, human cognitive load becomes overwhelming. A **Router Skill** solves this:
- A single user-invoked entry point (e.g., `ask-matt` or `workflow-router`).
- Acts as a map or index over the existing skills.
- Categorizes workflows into:
  - **The Main Flow**: The default highway from idea to ship (e.g., Grilling → Spec → Tickets → Implement → Review).
  - **On-Ramps**: Starting triggers (e.g., bug triage, diagnostic feedback).
  - **Upkeep / Architecture**: Maintenance surveys and codebase design.
  - **Standalone**: Ad-hoc tasks (e.g., prototype, handoff, conflict resolution).

---

## 4. Cross-Skill Dependencies & Tools

When one skill needs the capabilities of another:
- **Never hard-code relative cross-references to sibling skills**: Do not write `Refer to ../other-skill/SKILL.md`.
- **Explicit Skill Tool Calls**: Direct the agent to invoke the named skill using the native tool interface (e.g., "Call the Skill tool with `tdd`").
- **Single Invocation per Call**: Instruct the agent to invoke skills sequentially, not in batch, when order matters.
- **User-Invoked Preconditions**: If a skill depends on a user-invoked skill having already run, state it as a check for the user or human: "Verify that `/setup` has been run or request the user to run it". Never instruct the model to autonomously invoke a user-invoked skill.
