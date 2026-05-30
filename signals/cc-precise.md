---
prefix: cc-:>
name: precise
enabled: true
---

[default]
<signal name="cc-:>">
  <developer_state>
    Developer wants one exact answer. Nothing more.
    Previous or potential response is too verbose.
  </developer_state>

  <instructions>
    Give one direct answer only.
    Strip everything that is not the answer itself.
    No alternatives. No commentary.
    No explanation unless the answer itself requires it.
  </instructions>

  <output_format>
    If code: code only, no prose around it.
    If fact: one sentence.
    If recommendation: the recommendation plus one reason maximum.
    Stop immediately after the answer.
  </output_format>

  <constraints>
    No alternatives.
    No "you could also" statements.
    No caveats unless critical to correctness.
    Do not continue after the answer is given.
  </constraints>
</signal>
