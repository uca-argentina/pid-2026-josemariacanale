# Leading Words & Positive Framing

Reference guide for recruiting model priors and avoiding negative prompting traps.

---

## 1. What is a Leading Word?

A **leading word** is a compact concept already established in the foundation model's pretraining that anchors a whole region of engineering behavior in minimal tokens.

Instead of writing three paragraphs explaining how an agent should test, refactor, and isolate code, a single well-placed leading word recruits the exact behavioral prior needed:

| Verbose Explanation | Leading Word | Recruited Behavior |
| :--- | :--- | :--- |
| "A fast, deterministic test command that completes in under 2 seconds and gives instant feedback." | **Tight** feedback loop | Drives the agent to prune slow steps and focus on minimal reproduce commands. |
| "A test that fails specifically due to the bug and proves the bug exists before any code is modified." | **Red** test | Enforces the strict TDD state: failure first, green second. Binary observable state. |
| "A clean interface boundary where internal implementation can be swapped without touching callers." | **Seam** | Directs the agent to isolate module boundaries cleanly. |
| "A minimal end-to-end implementation that traverses every architectural layer to prove integration." | **Tracer bullet** | Prevents horizontal layer-by-layer procrastination; forces vertical validation. |
| "A module providing rich functionality through a small, intuitive surface area." | **Deep module** | Prevents shallow wrappers, micro-classes, and fragmented sprawl. |
| "An interview where the agent continuously challenges assumptions until all ambiguity is eliminated." | **Grill** | Directs the agent to ask probing, specific questions rather than blindly agreeing. |
| "Code written strictly to answer a feasibility question rather than to enter production." | **Throwaway prototype** | Frees the agent to explore quickly without over-engineering edge cases. |
| "The actual source code, commit history, or schema definition rather than a verbal summary." | **Primary source** | Forces the agent to inspect files directly rather than hallucinate based on assumptions. |
| "Ensuring that every model, variant, enum value, and failure branch has been addressed." | **Exhaustiveness** | Sets a strict bar that rejects partial or hand-waving solutions. |

---

## 2. The Anchor Effect

Leading words anchor behavior twice:
1. **In the body (Execution)**: The agent reaches for the same rigor every time the word appears. Inside reference tables, it focuses attention on what to seek out.
2. **In the context pointer (Invocation)**: When the same leading word lives in your prompts, your docs, and your skills, the agent automatically links them and triggers the appropriate workflow.

---

## 3. The Negation Trap (Prompting the Positive)

Steering by prohibition is one of the most common failure modes in agent prompts. 

When you instruct an agent:
> *"Don't write shallow tests and don't make assumptions."*

The model's attention mechanism strongly activates the tokens **shallow tests** and **assumptions**. The weak negation modifier is easily overrun, and the prohibition inadvertently increases the likelihood of the forbidden behavior.

### Refactoring Rules:
1. **State the Target Action**: Always declare what the agent **must do**, not what it must avoid.
2. **Pairs for Hard Guardrails**: If a prohibition is strictly necessary as a safety guardrail, pair it immediately with the positive target:
   - ❌ *Negative*: "Do not write code directly in the controller."
   - ✅ *Positive*: "Delegate all business logic to domain use-cases through the service seam."
   - ❌ *Negative*: "Don't guess what the schema is."
   - ✅ *Positive*: "Inspect `schema.prisma` as the primary source before proposing queries."
