---
prefix: cc-yes
aliases: cc-:), cc-lgtm, cc-bet, cc-slay, cc-based
name: confirm
enabled: true
---

[default]
<signal name="confirm">
  <developer_state>
    Developer is satisfied with the current direction.
    Brief confirmation and natural continuation is all that is needed.
  </developer_state>

  <instructions>
    Confirm the current approach briefly.
    Continue naturally in the same direction.
    Do not introduce new ideas, alternatives, or concerns
    unless they are critical to correctness.
  </instructions>

  <output_format>
    One to two sentences of confirmation.
    Then continue with whatever naturally comes next.
    Keep momentum — do not pause unnecessarily.
  </output_format>

  <constraints>
    No alternatives unless critical.
    No new directions unless asked.
    Keep it short.
  </constraints>
</signal>
