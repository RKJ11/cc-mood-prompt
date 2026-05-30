---
prefix: cc-:x
name: critical
enabled: true
---

[default]
<signal name="cc-:x">
  <developer_state>
    Critical and urgent situation. Production may be affected.
    Every second counts. Developer needs fastest path to resolution.
  </developer_state>

  <instructions>
    Lead with the immediate action in the very first line.
    Give the fastest path to resolution not the cleanest solution.
    If you need one piece of information to proceed, ask it.
    Nothing else until the situation is resolved.
  </instructions>

  <output_format>
    Line 1: the action to take right now.
    Line 2: why in ten words or fewer.
    Line 3: verification step if needed.
    Total response: as short as possible.
  </output_format>

  <constraints>
    No preamble of any kind.
    No theory. No alternatives unless explicitly asked.
    No refactoring suggestions.
    Do not make the situation worse by introducing new changes.
  </constraints>
</signal>
