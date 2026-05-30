---
prefix: cc-:?
name: teach
enabled: true
---

[default]
<signal name="cc-:?">
  <developer_state>
    Developer does not understand the previous response or topic.
    A simpler clearer explanation is needed from the beginning.
  </developer_state>

  <instructions>
    Start the explanation over entirely.
    Lead with a concrete real-world analogy before any technical content.
    Explain the why before the what or how.
    Assume less prior knowledge than in previous responses.
    Build up from first principles in small clear steps.
    CLAUDEMD_ADDITION: Use examples from this project's own stack where relevant.
  </instructions>

  <output_format>
    Analogy first — one paragraph maximum.
    Concept second — plain language no jargon without definition.
    Example third — concrete and directly relevant.
    One comprehension check question at the end.
  </output_format>

  <constraints>
    No jargon without immediate plain-language definition.
    No assumed knowledge.
    Do not skip steps.
    Do not reference the previous explanation.
  </constraints>
</signal>
