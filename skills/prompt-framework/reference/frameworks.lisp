(define-prompt-framework-library
  '("采用 Lisp 编程构建14个流行的提示工程框架的集合，清晰易用，便于AI提示词工程助理使用.")

  ;; Framework 1: RTF
  (framework
   (name "RTF")
   (stands-for "Role, Task, Format")
   (description "一个简单而强大的入门级框架，用于设定AI的角色、分配具体任务并指定输出格式。")
   (components
     (component (symbol R) (meaning "Role / 角色") (detail "为AI设定一个专家身份或角色。例如：你是一位资深的软件工程师。"))
     (component (symbol T) (meaning "Task / 任务") (detail "清晰、明确地描述需要完成的具体任务。例如：请为以下Python函数编写单元测试。"))
     (component (symbol F) (meaning "Format / 格式") (detail "指定期望的输出形式。例如：请以Markdown代码块的格式输出。"))))

  ;; Framework 2: APE
  (framework
   (name "APE")
   (stands-for "Action, Purpose, Expectation")
   (description "侧重于行动和意图，帮助AI理解任务背后的“为什么”。")
   (components
     (component (symbol A) (meaning "Action / 行动") (detail "需要执行的主要动作。例如：总结、翻译、生成、分析。"))
     (component (symbol P) (meaning "Purpose / 目的") (detail "执行该行动的最终目标是什么。例如：为了帮助初学者快速理解核心概念。"))
     (component (symbol E) (meaning "Expectation / 期望") (detail "对结果的具体期望和标准。例如：期望总结不超过200字，语言通俗易懂。"))))

  ;; Framework 3: CARE
  (framework
   (name "CARE")
   (stands-for "Context, Action, Result, Example")
   (description "通过提供完整的上下文和范例，引导AI进行精确的、有示例参考的输出。")
   (components
     (component (symbol C) (meaning "Context / 背景") (detail "提供任务相关的背景信息、约束条件。"))
     (component (symbol A) (meaning "Action / 行动") (detail "需要AI执行的具体指令。"))
     (component (symbol R) (meaning "Result / 结果") (detail "描述你期望得到什么样的结果。"))
     (component (symbol E) (meaning "Example / 示例") (detail "提供一个或多个输入/输出的范例。"))))

  ;; Framework 4: RACE
  (framework
   (name "RACE")
   (stands-for "Role, Action, Context, Expectation")
   (description "RTF的扩展，加入了更丰富的上下文信息。")
   (components
     (component (symbol R) (meaning "Role / 角色") (detail "设定AI的身份。"))
     (component (symbol A) (meaning "Action / 行动") (detail "需要执行的任务。"))
     (component (symbol C) (meaning "Context / 背景") (detail "提供与任务相关的具体情境。"))
     (component (symbol E) (meaning "Expectation / 期望") (detail "明确的输出标准和要求。"))))

  ;; Framework 5: TRACE
  (framework
   (name "TRACE")
   (stands-for "Task, Request, Action, Context, Examples")
   (description "一个非常详尽的框架，适用于复杂的、需要多步骤推理的任务。")
   (components
     (component (symbol T) (meaning "Task / 任务") (detail "最高层级的目标。"))
     (component (symbol R) (meaning "Request / 请求") (detail "对任务的具体请求。"))
     (component (symbol A) (meaning "Action / 行动") (detail "AI需要执行的一系列具体步骤。"))
     (component (symbol C) (meaning "Context / 背景") (detail "所有相关的背景信息。"))
     (component (symbol E) (meaning "Examples / 示例") (detail "提供清晰的示范。"))))

  ;; Framework 6: ROSES
  (framework
   (name "ROSES")
   (stands-for "Role, Objective, Scenario, Expected Solution, Steps")
   (description "面向问题解决场景的框架，结构清晰。")
   (components
     (component (symbol R) (meaning "Role / 角色") (detail "AI扮演的专家。"))
     (component (symbol O) (meaning "Objective / 目标") (detail "需要达成的明确目标。"))
     (component (symbol S) (meaning "Scenario / 场景") (detail "问题发生的具体场景。"))
     (component (symbol E) (meaning "Expected Solution / 期望方案") (detail "你期望的解决方案是什么样的。"))
      (component (symbol S) (meaning "Steps / 步骤") (detail "为AI提供或要求AI提供解决问题的步骤。"))))

  ;; Framework 7: CO-STAR
  (framework
    (name "CO-STAR")
    (stands-for "Context, Objective, Style, Tone, Audience, Response Format")
    (description "专为内容创作和文案生成设计，高度关注沟通的风格和受众。")
    (components
      (component (symbol C) (meaning "Context / 背景") (detail "写作的背景信息。"))
      (component (symbol O) (meaning "Objective / 目标") (detail "本次写作希望达成的目的。"))
      (component (symbol S) (meaning "Style / 风格") (detail "文章的风格，如：学术、轻松、专业。"))
      (component (symbol T) (meaning "Tone / 语调") (detail "文章的语调，如：幽默、严肃、乐观。"))
      (component (symbol A) (meaning "Audience / 受众") (detail "文章的目标读者是谁。"))
      (component (symbol R) (meaning "Response Format / 响应格式") (detail "输出的格式，如：博客文章、邮件、推文。"))))

  ;; Framework 8: TAG
  (framework
    (name "TAG")
    (stands-for "Task, Action, Goal")
    (description "一个简洁的、目标驱动的框架。")
    (components
      (component (symbol T) (meaning "Task / 任务") (detail "具体的任务是什么。"))
      (component (symbol A) (meaning "Action / 行动") (detail "AI需要执行的操作。"))
      (component (symbol G) (meaning "Goal / 目标") (detail "最终要实现的大目标。"))))

  ;; Framework 9: ERA
  (framework
    (name "ERA")
    (stands-for "Expectation, Role, Action")
    (description "将期望置于首位，让AI优先理解目标。")
    (components
      (component (symbol E) (meaning "Expectation / 期望") (detail "首先明确你的最终期望。"))
      (component (symbol R) (meaning "Role / 角色") (detail "AI需要扮演的角色。"))
      (component (symbol A) (meaning "Action / 行动") (detail "需要执行的具体任务。"))))

  ;; Framework 10: RISE
  (framework
    (name "RISE")
    (stands-for "Role, Input, Steps, Expectation")
    (description "适用于处理给定输入并需按步骤执行的任务。")
    (components
      (component (symbol R) (meaning "Role / 角色") (detail "设定AI的身份。"))
      (component (symbol I) (meaning "Input / 输入") (detail "提供给AI处理的原始数据或文本。"))
      (component (symbol S) (meaning "Steps / 步骤") (detail "要求AI遵循的处理步骤。"))
      (component (symbol E) (meaning "Expectation / 期望") (detail "对最终输出的详细要求。"))))

  ;; Framework 11: ICIO
  (framework
    (name "ICIO")
    (stands-for "Instruction, Context, Input, Output")
    (description "一个非常适合链式思考（Chain-of-Thought）和少样本（Few-shot）学习的框架。")
    (components
      (component (symbol I) (meaning "Instruction / 指令") (detail "清晰的指令，告诉模型要做什么。"))
      (component (symbol C) (meaning "Context / 背景") (detail "提供必要的背景信息。"))
      (component (symbol I) (meaning "Input / 输入") (detail "需要处理的具体输入数据。"))
      (component (symbol O) (meaning "Output / 输出") (detail "描述期望的输出格式或提供一个输出范例。"))))

  ;; Framework 12: COAST
  (framework
    (name "COAST")
    (stands-for "Context, Objective, Actions, Scenario, Task")
    (description "一个全面的框架，结合了情境、目标和具体任务。")
    (components
      (component (symbol C) (meaning "Context / 背景") (detail "事件的背景信息。"))
      (component (symbol O) (meaning "Objective / 目标") (detail "你希望达到的最终目的。"))
      (component (symbol A) (meaning "Actions / 行动") (detail "为达成目标需要执行的一系列动作。"))
      (component (symbol S) (meaning "Scenario / 场景") (detail "设定一个具体的应用场景。"))
      (component (symbol T) (meaning "Task / 任务") (detail "分配给AI的具体、可执行的任务。"))))

  ;; Framework 13: CBR
  (framework
    (name "CBR")
    (stands-for "Context, Background, Request")
    (description "一个在发出请求前，充分铺垫背景信息的框架，确保AI完全理解前提。")
    (components
      (component (symbol C) (meaning "Context / 背景") (detail "当前的核心情境。"))
      (component (symbol B) (meaning "Background / 前提") (detail "与情境相关的历史信息、数据或约束。"))
      (component (symbol R) (meaning "Request / 请求") (detail "基于以上所有信息，提出你的具体要求。"))))

  ;; Framework 14: 三段式提示词 (The Three-Part Prompt)
  (framework
    (name "三段式提示词")
    (stands-for "角色/前提, 任务/要求, 示例/格式")
    (description "一个 foundational (基础的)、高度实用的框架，将一个提示词清晰地划分为三个逻辑部分：设定背景、下达指令和规定输出。它是构建结构化提示词的起点。")
    (components
      (component (symbol Part1) (meaning "角色/前提 (Context/Role)") (detail "第一部分，用于设定AI的角色、背景、规则或约束条件。它告诉AI'你是谁'以及'在什么规则下思考'。例如：'你是一名资深的市场分析师，接下来的回答都必须基于公开的市场数据。'"))
      (component (symbol Part2) (meaning "任务/要求 (Task/Requirement)") (detail "第二部分，是提示词的核心。它清晰、具体地说明了需要AI完成的任务是什么。它告诉AI'要做什么'。例如：'请分析2024年全球电动汽车市场的三个主要趋势。'"))
      (component (symbol Part3) (meaning "示例/格式 (Example/Format)") (detail "第三部分，用于指导AI如何输出结果。可以提供一个具体的输出范例（Few-shot），或者明确描述输出的格式、风格、长度等。它告诉AI'如何交付结果'。例如：'请以要点列表的形式输出，每个要点后附上简短的说明。'"))))
)
