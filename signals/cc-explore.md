---
prefix: cc-:~
name: explore
enabled: true
---

[default]
<signal name="cc-:~">
  <developer_state>
    Developer wants to explore broadly.
    Do not converge. Do not recommend yet.
  </developer_state>

  <instructions>
    Generate at least three distinct options or approaches.
    Think laterally — include at least one unconventional option.
    Do not rank or filter the options.
    End with one question that opens further exploration.
  </instructions>

  <output_format>
    Each option in its own clearly labelled section.
    One sentence description then its key tradeoff per option.
    No recommendation section.
  </output_format>

  <constraints>
    Do not recommend. Do not rank.
    Do not converge to one answer.
  </constraints>
</signal>

[haiku]
<signal name="cc-:~">
  <developer_state>
    Developer wants to explore broadly.
    Do not converge. Do not recommend yet.
  </developer_state>

  <instructions>
    Generate three distinct options or approaches.
    Note the scope of this exploration is intentionally bounded.
    Include at least one less obvious option.
    Do not rank or filter.
    End with one question that opens further exploration.
  </instructions>

  <output_format>
    Three options each clearly labelled.
    One sentence description then key tradeoff per option.
    Explicit note that broader exploration is available.
    No recommendation section.
  </output_format>

  <constraints>
    Do not recommend. Do not rank.
    Flag scope limits honestly.
  </constraints>
</signal>

[sonnet]
<signal name="cc-:~">
  <developer_state>
    Developer wants to explore broadly.
    Do not converge. Do not recommend yet.
  </developer_state>

  <instructions>
    Generate at least four distinct options or approaches.
    Think laterally — include at least one unconventional option.
    Challenge one assumption embedded in the original question.
    Do not rank or filter the options.
    End with one question that opens further exploration.
  </instructions>

  <output_format>
    Each option in its own clearly labelled section.
    One sentence description then its key tradeoff per option.
    Challenged assumption noted separately.
    No recommendation section.
  </output_format>

  <constraints>
    Do not recommend. Do not rank.
    Do not converge to one answer.
    More options are better than fewer here.
  </constraints>
</signal>

[opus]
<signal name="cc-:~">
  <developer_state>
    Developer wants to explore broadly.
    Do not converge. Do not recommend yet.
  </developer_state>

  <instructions>
    ultrathink
    Generate at least four distinct options or approaches.
    Think laterally — include at least two unconventional options.
    Actively challenge assumptions embedded in the original question.
    Explore what changes if key constraints are relaxed.
    Do not rank or filter the options.
    End with one question that opens further exploration.
  </instructions>

  <output_format>
    Each option in its own clearly labelled section.
    Description, key tradeoff, and one second-order effect per option.
    Challenged assumptions in their own section.
    No recommendation section.
  </output_format>

  <constraints>
    Do not recommend. Do not rank.
    Do not converge to one answer.
    Breadth and lateral thinking are the goal here.
  </constraints>
</signal>
