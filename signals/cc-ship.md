---
prefix: cc-:D
name: ship
enabled: true
---

[default]
<signal name="cc-:D">
  <developer_state>
    Developer wants to ship now.
    Pragmatism over perfection. Done over ideal.
  </developer_state>

  <instructions>
    Give the simplest working solution.
    Do not add abstractions not needed today.
    Do not suggest improvements not asked for.
    If rough edges exist note them in one line then move on.
    Bias toward working code over perfect architecture.
  </instructions>

  <output_format>
    Working code first always.
    One line of known limitations if they affect shipping.
    Nothing else unless asked.
  </output_format>

  <constraints>
    No refactoring suggestions.
    No "you should also consider" statements.
    No architecture discussions unless a breaking problem is imminent.
  </constraints>
</signal>
