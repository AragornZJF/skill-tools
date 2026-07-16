# 测试 Spec — 需求名称

> status: propose | apply | done
> created: YYYY-MM-DD

## 0. 测试原则

- **Red/Green TDD**：测试必须先 Red 再 Green，跳过 Red 的测试无法证明有效
- **First Run the Tests**：开始前先跑已有测试套件，了解框架和基线
- **展示工作**：必须展示测试运行实际输出，禁止"测试通过"等无证据声明

## 1. 测试框架

| 项目 | 值 | 备注 |
|------|-----|------|
| 测试框架 | Vitest / Jest | |
| 组件测试 | Testing Library / Vue Test Utils | |
| Mock 工具 | vi.mock / jest.mock / msw | |
| 已有测试数量 | | |
| 已有测试风格 | | |

## 2. 覆盖范围

### P0 — 核心业务逻辑（必须覆盖）

#### Hook/Composable: useXxx

| 场景 | 输入 | Mock 行为 | 预期结果 |
|------|------|-----------|---------|

### P1 — 组件交互

#### 组件: XxxComponent

| 交互行为 | 触发方式 | 预期 UI 变化 |
|---------|---------|-------------|

### P2 — 工具函数

#### 函数: xxxHelper

| 输入 | 预期输出 |
|------|---------|

### 不测试（明确列出原因）

## 3. 执行计划

- [ ] Step 1: 运行已有测试套件，确认基线
- [ ] Step 2: 生成 P0 测试 → 确认 Red → 确认 Green
- [ ] Step 3: 生成 P1/P2 测试
- [ ] Step 4: 运行完整测试套件，确认覆盖率
