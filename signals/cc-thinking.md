---
prefix: cc-:|
name: thinking
enabled: true
---

[default]
<signal name="cc-:|">
  <developer_state>
    Developer wants deeper analysis than previously provided.
    Shallow answers are not sufficient here.
  </developer_state>

  <instructions>
    Explore this problem from at least three distinct angles.
    Make tradeoffs explicit for each option.
    Give your recommendation last with clear reasoning.
    Flag anything that would meaningfully change the answer.
  </instructions>

  <output_format>
    Start with the core tension or question.
    Each angle labelled and clearly separated.
    Recommendation at the end not the start.
  </output_format>

  <constraints>
    Do not converge to one answer too quickly.
    Depth over brevity for this signal.
  </constraints>
</signal>

[haiku]
<signal name="cc-:|">
  <developer_state>
    Developer wants deeper analysis than previously provided.
    Shallow answers are not sufficient here.
  </developer_state>

  <instructions>
    Provide a focused analysis of the two most important tradeoffs.
    Be explicit about the limits of this analysis.
    Flag where deeper investigation would be needed.
    Give your recommendation with clear reasoning.
  </instructions>

  <output_format>
    Two tradeoffs labelled clearly.
    Explicit note on what this analysis does not cover.
    Recommendation last.
  </output_format>

  <constraints>
    Do not overstate the depth of analysis available.
    Flag limits honestly.
  </constraints>
</signal>

[sonnet]
<signal name="cc-:|">
  <developer_state>
    Developer wants deeper analysis than previously provided.
    Shallow answers are not sufficient here.
  </developer_state>

  <instructions>
    Explore this problem from at least three distinct angles.
    Make tradeoffs explicit — state what each option costs in
    complexity, performance, and maintainability.
    Challenge assumptions in the prompt if worth challenging.
    Give your recommendation last with clear reasoning.
    Flag anything that would meaningfully change the answer.
  </instructions>

  <output_format>
    Start with the core tension or question.
    Each angle labelled and clearly separated.
    Tradeoffs explicit per option.
    Recommendation at the end not the start.
  </output_format>

  <constraints>
    Do not converge to one answer too quickly.
    Depth over brevity for this signal.
  </constraints>
</signal>

[opus]
<signal name="cc-:|">
  <developer_state>
    Developer wants deeper analysis than previously provided.
    Shallow answers are not sufficient here.
  </developer_state>

  <instructions>
    ultrathink
    Explore this problem from at least three distinct angles.
    Make tradeoffs explicit — state what each option costs in
    complexity, performance, maintainability, and long-term risk.
    Challenge assumptions embedded in the prompt if warranted.
    Think about second-order effects and long-term implications.
    Give your recommendation last with full reasoning.
    Flag anything that would meaningfully change the answer.
  </instructions>

  <output_format>
    Start with the core tension or question.
    Each angle in its own section with explicit tradeoffs.
    Second-order effects noted where material.
    Recommendation last with full justification.
  </output_format>

  <constraints>
    Do not converge to one answer too quickly.
    Do not bury the recommendation at the start.
    Depth and completeness over brevity for this signal.
  </constraints>
</signal>
