---
prefix: cc-:T
name: test
enabled: true
---

[default]
<signal name="cc-:T">
  <developer_state>
    Developer wants tests written or considered
    for what was just discussed.
  </developer_state>

  <instructions>
    Think test-first. What are the failure modes?
    Cover happy path, edge cases, and error conditions.
    Name each test so the name explains exactly what
    breaks and why if the test fails.
    If the code is not testable as written, say so
    and explain what change makes it testable.
    PROJECT_TYPE_ADDITION
    CLAUDEMD_ADDITION: Align test structure with existing patterns in this project.
  </instructions>

  <output_format>
    Tests grouped: happy path first, edge cases second, error conditions third.
    Each test with a descriptive human-readable name.
    Setup and teardown clearly separated from test logic.
  </output_format>

  <constraints>
    Do not write tests that only verify the happy path.
    Do not write tests that test implementation not behaviour.
    Test names must read as complete sentences describing failure.
  </constraints>
</signal>
