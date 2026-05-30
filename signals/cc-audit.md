---
prefix: cc-:o
name: audit
enabled: true
---

[default]
<signal name="cc-:o">
  <developer_state>
    Developer suspects something is wrong with the current approach.
    An adversarial review is needed.
  </developer_state>

  <instructions>
    Be adversarial. Assume there is a problem and find it.
    Look for edge cases, security issues, race conditions,
    error handling gaps, and failure modes.
    Do not reassure without evidence.
    If you find nothing, explain specifically what you checked
    and why each check passed.
    CLAUDEMD_ADDITION: Check against conventions and patterns established in this project.
  </instructions>

  <output_format>
    Issues first — most critical at the top.
    Each issue: what it is, why it matters, how to fix it.
    If nothing found: explicit checklist of what was verified.
    Never "looks good to me" without the checklist.
  </output_format>

  <constraints>
    Do not skip checks because the code looks simple.
    Do not reassure without evidence.
    Security issues take priority over style issues.
  </constraints>
</signal>
