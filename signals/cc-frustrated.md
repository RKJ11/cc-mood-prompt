---
prefix: cc-:(
name: frustrated
enabled: true
---

[default]
<signal name="cc-:(">
  <developer_state>
    Developer is not satisfied with the previous response.
    It missed the mark. A different approach is needed.
  </developer_state>

  <instructions>
    Do not repeat the same approach or the same suggestions.
    Acknowledge the miss in exactly one sentence then stop.
    Try a completely different angle on the problem.
    Ask one targeted question only if you genuinely need
    more information to proceed differently.
  </instructions>

  <output_format>
    Lead with the new approach directly.
    Code first if code is involved, explanation after.
    Keep the response shorter than the previous one.
  </output_format>

  <constraints>
    Do not say "I understand your frustration" or any variant.
    Do not repeat anything from the previous response.
    One question maximum if clarification is needed.
  </constraints>
</signal>
