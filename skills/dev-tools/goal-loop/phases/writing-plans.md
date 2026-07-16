# Phase 2 默认 — 产出 IMPLEMENTATION_PLAN.md（Writing-Plans）

基于 `specs/*` 中的规格，产出细粒度的 `IMPLEMENTATION_PLAN.md`。

## 核心纪律

每个任务必须是 **细粒度、自包含** 的——不是粗略的要点愿望清单。

### 任务定义

| 属性 | 要求 |
|------|------|
| 工作量 | **2-5 分钟**（值得在构建循环中单独实现的最小单位） |
| 文件路径 | **确切路径**——要创建或修改哪些文件（如 `build/auth/login.ts`） |
| 完整代码 | **可直接写入的代码**，不是描述 |
| 验证步骤 | **确切命令**——确认此任务完成的命令（测试/检查/构建） |
| 无占位符 | 没有"TBD"、没有"类似任务 N"、没有模糊描述 |

### 任务格式

```
### Task N: <任务名称>
Files: create/modify <确切路径>
Verification: <确切命令>
<完整代码>
```

这种格式让构建循环（Phase 3）每轮选一个任务就能直接完成，不需要额外规划。

## 流程

1. 读取 `specs/*` 中的所有规格文件
2. 研究 `build/*` 中的现有代码（不假设未实现，先用搜索确认）
3. 与 `specs/*` 做差距分析
4. 将 `build/lib` 视为项目的标准库 — 优先整合惯用实现而非临时复制
5. 产出 `IMPLEMENTATION_PLAN.md`，任务按优先级有序排列
6. 如果发现 specs 中有缺失的元素，先搜索确认不存在，然后在 `specs/<文件名>.md` 中编写规格，并在计划中记录实现计划

## 示例

```
### Task 3: 实现用户登录 API
Files: create build/auth/login.ts, modify build/auth/router.ts
Verification: npm run test:auth
```
```typescript
// build/auth/login.ts
export function login(email: string, password: string): Promise<User> {
  // ...
}
```
```

## 输出

`IMPLEMENTATION_PLAN.md` — 一个有序的任务列表，Phase 3 构建循环按顺序消费。
