# 角色词典

## 角色决策表（语义映射核心）
小王子始终在场当贯穿旅人；该章主旨决定星球上迎来哪位客人。
| 内容信号词 | 客人 | 客人画法 |
|---|---|---|
| 爱 / 独特 / 珍视 / 渴望 / 骄傲 / 牵挂 | 🌹 玫瑰 | 玻璃罩中的花 |
| 洞察 / 看清 / 责任 / 驯养 / 友谊 / 用心 | 🦊 狐狸 | 坐姿，面向王子 |
| 叙述 / 童真丧失 / 成人世界 / 回忆 / 坠落 | 👨‍✈️ 飞行员 | 小飞机 / wreckage 旁 |
| 生命 / 死亡 / 离别 / 神秘 / 转折 / 谜 | 🐍 蛇 | 盘绕，头微扬 |
| 节奏 / 定时 / 反复 / 值守 / 轮询 / 到点就干 | 🪔 点灯人 | 灯柱旁举手点灯 |
| 旅程 / 探索 / 初遇 / 无强主题 | （无客人，王子独行） | — |

主题不匹配任何行 → 王子独行幕。星球（沙地弧）永远是场景本身。

> watercolor 配色见 `svg-style.md`。下面片段默认 line 画风；坐标按 600×800 默认布局给出，可直接粘进 `scene-template.svg`，换 size 时整体等比缩放。

---

## 小王子（贯穿主角，统一定义，每幕复用这一份）
立于左中（约 x=235），脚 y≈610，面向右（看向客人）。

```svg
<g id="prince" fill="none" stroke="#141414">
  <circle cx="235" cy="470" r="15" stroke-width="2.2"/>
  <path d="M220 461 Q234 445 250 461 M220 461 Q215 478 221 495 M250 461 Q255 478 249 495" stroke-width="1.4"/>
  <circle cx="230" cy="471" r="1.7" fill="#141414" stroke="none"/>
  <circle cx="240" cy="471" r="1.7" fill="#141414" stroke="none"/>
  <path d="M233 476 q1.5 2 3 0" stroke-width=".8"/>
  <path d="M230 479 q5 2.5 9 0" stroke-width=".8"/>
  <path d="M222 486 q13 6 26 0" stroke-width="1.6"/>
  <path d="M247 486 q6 3 9 9" stroke-width="1.4"/>
  <path d="M235 489 Q210 506 206 588" stroke-width="2"/>
  <path d="M235 489 Q260 506 264 588" stroke-width="2"/>
  <path d="M206 588 q29 6 58 0" stroke-width="1.6"/>
  <line x1="235" y1="491" x2="235" y2="585" stroke-width="1" opacity=".5"/>
  <circle cx="235" cy="518" r="1" fill="#141414" stroke="none"/>
  <circle cx="235" cy="536" r="1" fill="#141414" stroke="none"/>
  <circle cx="235" cy="554" r="1" fill="#141414" stroke="none"/>
  <path d="M212 504 q-5 16 -3 30" stroke-width="1.8"/>
  <path d="M258 504 q7 13 11 23" stroke-width="1.8"/>
  <path d="M223 588 q-1 14 0 22" stroke-width="1.8"/>
  <path d="M247 588 q1 14 0 22" stroke-width="1.8"/>
  <path d="M215 608 q8 4 14 0" stroke-width="1.4"/>
  <path d="M240 608 q8 4 14 0" stroke-width="1.4"/>
</g>
```

## 星球表面 / 沙地弧（每章场景本身）
```svg
<g id="ground" fill="none" stroke="#141414">
  <path d="M40 640 Q300 565 560 640" stroke-width="2.6"/>
  <path d="M40 640 Q300 700 560 640" stroke-width="1.4" opacity=".4"/>
  <path d="M120 605 Q140 600 165 604" stroke-width="1" opacity=".5"/>
  <path d="M380 600 Q405 595 430 600" stroke-width="1" opacity=".5"/>
  <circle cx="250" cy="630" r="3" stroke-width="1" opacity=".5"/>
</g>
```

---

## 客人片段（按章节替换进 `#guest` 槽，立于右侧约 x=330–470）

### 🌹 玫瑰 — 爱 / 独特 / 珍视 / 骄傲 / 牵挂
```svg
<g id="guest-rose" fill="none" stroke="rgb(192,57,43)">
  <path d="M330 600 Q330 520 380 512 Q430 520 430 600" stroke-width="2.2"/>
  <path d="M336 600 Q338 526 380 519 Q422 526 424 600" stroke-width="1.2" opacity=".3"/>
  <line x1="326" y1="600" x2="434" y2="600" stroke-width="2"/>
  <line x1="380" y1="600" x2="380" y2="560" stroke-width="1.6"/>
  <path d="M380 580 q-16 -4 -20 -14 q12 0 20 6" stroke-width="1.4"/>
  <path d="M380 572 q16 -2 22 -12 q-12 -2 -22 6" stroke-width="1.4"/>
  <path d="M380 588 l-5 -3" stroke-width="1.4"/>
  <path d="M380 568 l5 -3" stroke-width="1.4"/>
  <circle cx="380" cy="548" r="12" stroke-width="1.8"/>
  <circle cx="380" cy="548" r="8" stroke-width="1.5"/>
  <circle cx="380" cy="548" r="4" stroke-width="1.3"/>
</g>
```

### 🦊 狐狸 — 洞察 / 看清 / 责任 / 驯养 / 友谊 / 用心（坐姿，面向王子）
```svg
<g id="guest-fox" fill="none" stroke="#141414">
  <path d="M430 600 q40 -8 36 -56 q-2 -30 -24 -28 q-18 2 -14 30 q4 22 -2 40 Z" stroke-width="1.8"/>
  <path d="M344 604 q-12 -34 16 -44 q40 -8 56 14 q8 20 -6 30 q-32 8 -66 0 Z" stroke-width="1.8"/>
  <path d="M360 585 q14 8 30 0" stroke-width="1" opacity=".4"/>
  <path d="M336 565 q-22 2 -26 -14 q-2 -16 14 -20 q20 -2 28 12 q6 16 -8 22 Z" stroke-width="1.8"/>
  <path d="M330 540 l-6 -16 l14 8 Z" stroke-width="1.6"/>
  <path d="M344 536 l2 -18 l12 10 Z" stroke-width="1.6"/>
  <circle cx="320" cy="554" r="1.8" fill="#141414" stroke="none"/>
  <path d="M312 562 q-4 1 -4 -2" stroke-width="1.2"/>
  <path d="M340 558 q4 4 8 1" stroke-width="1" opacity=".5"/>
  <path d="M362 604 q-2 8 1 12" stroke-width="1.6"/>
  <path d="M386 604 q-2 8 1 12" stroke-width="1.6"/>
  <path d="M358 616 q5 3 9 0" stroke-width="1"/>
  <path d="M382 616 q5 3 9 0" stroke-width="1"/>
</g>
```

### 👨‍✈️ 飞行员 — 叙述 / 童真丧失 / 成人世界 / 回忆 / 坠落（小飞机在身后）
```svg
<g id="guest-pilot" fill="none" stroke="#141414">
  <path d="M400 580 q30 -10 40 -30 l8 4 q-6 16 -30 26" stroke-width="1.6"/>
  <line x1="430" y1="555" x2="452" y2="548" stroke-width="1.4"/>
  <path d="M420 575 l-10 14" stroke-width="1.4"/>
  <circle cx="345" cy="528" r="13" stroke-width="2.2"/>
  <path d="M333 524 q12 -8 24 0" stroke-width="1.4"/>
  <line x1="333" y1="522" x2="357" y2="522" stroke-width="1.6"/>
  <circle cx="340" cy="530" r="1.6" fill="#141414" stroke="none"/>
  <circle cx="350" cy="530" r="1.6" fill="#141414" stroke="none"/>
  <path d="M343 536 q3 2 6 0" stroke-width=".8"/>
  <path d="M345 542 Q326 556 322 600" stroke-width="2"/>
  <path d="M345 542 Q364 556 368 600" stroke-width="2"/>
  <path d="M322 600 q23 5 46 0" stroke-width="1.6"/>
  <line x1="345" y1="544" x2="345" y2="596" stroke-width="1" opacity=".5"/>
  <path d="M328 552 q-4 14 -2 26" stroke-width="1.8"/>
  <path d="M362 552 q6 12 10 20" stroke-width="1.8"/>
  <path d="M334 600 q-1 12 0 14" stroke-width="1.8"/>
  <path d="M356 600 q1 12 0 14" stroke-width="1.8"/>
  <path d="M328 612 q7 4 12 0" stroke-width="1.4"/>
  <path d="M350 612 q7 4 12 0" stroke-width="1.4"/>
</g>
```

### 🐍 蛇 — 生命 / 死亡 / 离别 / 神秘 / 转折 / 谜（盘绕，头微扬）
```svg
<g id="guest-snake" fill="none" stroke="#141414">
  <ellipse cx="370" cy="598" rx="40" ry="9" stroke-width="2"/>
  <ellipse cx="372" cy="588" rx="32" ry="8" stroke-width="1.8"/>
  <ellipse cx="374" cy="579" rx="24" ry="7" stroke-width="1.6"/>
  <path d="M390 575 q14 -14 6 -28 q-8 -10 -20 -4" stroke-width="2"/>
  <path d="M376 543 q-10 -2 -12 -10 q4 -6 12 -2 q4 6 0 12 Z" stroke-width="1.8"/>
  <circle cx="370" cy="534" r="1.5" fill="#141414" stroke="none"/>
  <path d="M364 537 q-8 -2 -12 -6" stroke-width="1.2"/>
  <path d="M352 531 l-3 -2 M352 531 l-2 3" stroke-width="1"/>
  <path d="M384 562 q4 -3 8 0" stroke-width="1" opacity=".5"/>
</g>
```

### 🪔 点灯人 — 节奏 / 定时 / 反复 / 值守 / 轮询（灯柱旁举手点灯）
```svg
<g id="guest-lamplighter" fill="none" stroke="#141414">
  <!-- 灯柱 -->
  <line x1="400" y1="600" x2="400" y2="520" stroke-width="2"/>
  <rect x="390" y="503" width="20" height="20" stroke-width="1.8"/>
  <line x1="386" y1="523" x2="414" y2="523" stroke-width="1.4"/>
  <!-- 火焰 + 微光 -->
  <path d="M400 500 q3 -5 0 -9 q-3 4 0 9 Z" stroke-width="1.4"/>
  <line x1="400" y1="488" x2="400" y2="483" stroke-width="1"/>
  <line x1="391" y1="495" x2="387" y2="493" stroke-width="1"/>
  <line x1="409" y1="495" x2="413" y2="493" stroke-width="1"/>
  <!-- 点灯人（灯柱右侧，举手向灯） -->
  <circle cx="448" cy="548" r="11" stroke-width="2"/>
  <circle cx="444" cy="548" r="1.5" fill="#141414" stroke="none"/>
  <circle cx="452" cy="548" r="1.5" fill="#141414" stroke="none"/>
  <path d="M443 554 q5 2 10 0" stroke-width=".8"/>
  <path d="M448 560 Q435 572 433 600" stroke-width="1.8"/>
  <path d="M448 560 Q461 572 463 600" stroke-width="1.8"/>
  <path d="M433 600 q15 4 30 0" stroke-width="1.5"/>
  <path d="M436 566 q-12 -10 -23 -22" stroke-width="1.8"/>
  <circle cx="413" cy="544" r="2.2" fill="#141414"/>
  <path d="M460 566 q6 8 6 18" stroke-width="1.6"/>
  <path d="M439 600 q-1 10 0 12" stroke-width="1.6"/>
  <path d="M457 600 q1 10 0 12" stroke-width="1.6"/>
</g>
```

### 王子独行（无客人）— 旅程 / 探索 / 无强主题
只放 `#prince` + `#ground`，右侧空着（可加 1 颗小行星点缀）。需一颗朱砂红 **指路星**（造型三选一：十字星 / 菱形星 / 彗星，见 svg-style.md），位置随幕变化。按意境可选道具：路（脚下弧线）、脚印（沙地点）、火山（远景锥形）、望远镜（王子持或立）、月亮（天边）。
