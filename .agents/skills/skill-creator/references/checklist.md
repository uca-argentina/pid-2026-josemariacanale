# Skill Quality & Audit Checklist

Use this checklist to review any new or revised skill before publishing it to the `.agents/skills/` directory.

---

## 1. Frontmatter & Identity

- [ ] **Name format**: Lowercase, hyphenated kebab-case (e.g. `api-contract-verifier`).
- [ ] **Invocation alignment**:
  - If **model-invoked**: Description contains rich trigger phrasing ("Use when...", target symptoms, and leading words). No `disable-model-invocation`.
  - If **user-invoked**: `disable-model-invocation: true` is set. Description is a concise, 1-line human summary without model trigger phrasing.
- [ ] **Third-person perspective**: All description text is phrased in the third person.

---

## 2. Information Hierarchy & Progressive Disclosure

- [ ] **Step focus**: `SKILL.md` contains only the essential sequence of actions and immediately needed rules.
- [ ] **Disclosed reference**: Bulky templates, exhaustive rule tables, and multi-page guides are relocated to `references/` or `resources/`.
- [ ] **Valid relative links**: All pointers to companion files use clean markdown links (e.g., `[rules.md](./references/rules.md)`).
- [ ] **Branch layout**: Multi-way choices, triggers, or options are organized into tables or bullet lists, never dense prose paragraphs.

---

## 3. Leading Words & Framing

- [ ] **Positive steering**: Every instruction states the positive target action rather than a prohibition (no isolated "Don't..." rules).
- [ ] **Conceptual anchors**: Core behaviors recruit pretrained leading words (*tight*, *red*, *seam*, *tracer bullet*, *deep module*, *primary source*).
- [ ] **Conciseness**: Multi-sentence descriptions of well-known practices have been collapsed into sharp conceptual terms.

---

## 4. Completion Criteria & Execution Guardrails

- [ ] **Observable bounds**: Every step terminates on a concrete, observable condition (e.g., a file written, a test passing, a specific diff verified).
- [ ] **Anti-rush resistance**: Completion bounds prevent premature exit (e.g., "all enum variants accounted for" instead of "review the schema").
- [ ] **Verification step included**: The skill includes explicit instructions on how the agent must verify that the outcome is valid before declaring done.

---

## 5. Pruning & No-Op Sweep

- [ ] **No default instructions**: Instructions telling the model to "think carefully", "write clean code", or "be helpful" have been deleted.
- [ ] **No environment caching**: Dynamic facts available via one-shot shell commands (`package.json`, git status, directory listing) are left to the environment rather than hard-coded.
- [ ] **Single source of truth**: No concept or rule is duplicated across multiple sections or sibling files.
