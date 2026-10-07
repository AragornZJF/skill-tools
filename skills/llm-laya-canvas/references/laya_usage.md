# Laya 用法速查 + 实战经验

Laya 是一个非生成式的 "System 1" 决策模型：typed question 进，校准概率出，单次前向 ~35ms，本地可跑。
仓库：`github.com/NandhaKishorM/laya`，PyPI：`pip install laya`（Python ≥ 3.10）。

## Python API（路由模式，推荐）

```python
import laya
from laya import Router

router = Router(preload=True)  # 预载检查点，亚 35ms 路由

state = "The element sits in the upper-left, overlapping the title by a small amount, with a 24px margin."

questions = {
    "placement_quality": {
        "type": "noul",                              # 返回 0.0~1.0 校准概率
        "instructions": "Is this a clean, uncluttered placement for the element?",
    }
}

res = router.predict(state, questions)
p = res["answers"]["placement_quality"]["noul"]       # 0.0 ~ 1.0
# 多语言时 res["routing"]["model"] 会告诉你走了哪个检查点
```

单模型模式（直接加载某个检查点）：

```python
import laya
agent = laya.load("convaiinnovations/laya")           # 英文根
# agent = laya.load("convaiinnovations/laya", subfolder="multilingual")  # 100+ 语言
agent.predict(state, questions)["answers"]["placement_quality"]["noul"]
```

要点：`state` 是文本或字典；用 `"type": "noul"` 声明"我要概率"；概率从 `answers[问题名]["noul"]` 取。

## 5 条实战经验（来自 Laya 官方 FAQ，直接决定本 skill 怎么写）

1. **问状态，别问动作。** 问"往哪边动"每个 checkpoint 都答反；问"鸟在哪"给干净梯度（0.95 / 0.82 / 0.06 / 0.07 / 0.02）。
   → 本 skill 问"这个落点好不好"，而不是"该放哪"。
2. **它不会算数。** 给两个高度，哪个更低它分不清。**几何 / 算术必须在代码里做完**，把结论用文字喂给它。
   → 本 skill 在代码里算好 overlap / margin / alignment，再写成一句话。
3. **措辞极其敏感。** "blocked by a barrier" 区分度 0.75，"blocked by a train" 只有 0.45。建议试 3 种说法再测。
   → 本 skill 对同一个落点用 3 种问法取平均（`scripts/laya_place.py` 的 `PHRASINGS`）。
4. **概率可校准但要自己拟合。** 比"LLM 说自己很确定"可信；在自家数据上拟合温度、设阈值，不确定样本转默认 / 人工。
5. **多语会翻车。** 自动路由认 7 种拉丁语系，波兰语会错投英文 checkpoint 胡编；多语 checkpoint 出厂未校准，要加语言提示。

## 为什么用 Laya 做"放哪"而不是 LLM

- 快：单次前向 ~35ms，200 个落点也能秒级扫完；LLM 逐个想既慢又贵。
- 稳：同一句话可重复打分，不漂移、不编故事。
- 便宜：本地跑，不上 API、不泄露画布内容。
- 这正是 Laya 的设计意图：把"读状态 → 给概率 → 行动"从 LLM 手里抢回来（详见 brainfunctioncollapse.com/laya）。
