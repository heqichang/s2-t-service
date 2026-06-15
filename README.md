# 智能客服与工单管理系统

## 项目概述

一个完整的智能客服与工单管理系统，包含客户工作台、客服工作台、工单管理、实时消息、通知系统等功能。

## 技术栈

- **后端**: Node.js + Express + TypeScript + Prisma + SQLite + Socket.io
- **前端**: React 18 + TypeScript + Vite + Ant Design + Socket.io Client

## 目录结构

```
t-service/
├── server/          # 后端服务
│   ├── prisma/      # 数据库模型和迁移
│   └── src/         # 源代码
└── client/          # 前端应用
    └── src/         # 源代码
```

## 快速开始

### 1. 启动后端服务

```bash
cd server
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

后端服务启动在 http://localhost:3000

### 2. 启动前端应用

```bash
cd client
npm install
npm run dev
```

前端应用启动在 http://localhost:5173

## 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@example.com | 123456 |
| 客服 | agent1@example.com | 123456 |
| 客服 | agent2@example.com | 123456 |
| 客服 | agent3@example.com | 123456 |
| 客户 | customer1@example.com | 123456 |
| 客户 | customer2@example.com | 123456 |
| 客户 | customer3@example.com | 123456 |

## 功能模块

### 用户与客服
- 客户注册/登录
- 客服账号管理（账号、姓名、所属团队）
- 客服在线状态（在线/忙碌/离线）
- 客服分组（按业务类型分组）

### 工单管理
- 创建工单（标题、描述、优先级、分类、标签）
- 工单状态流转（待处理 / 处理中 / 等待客户 / 已解决 / 已关闭）
- 工单分配（自动/手动指派客服）
- 工单回复（客服↔客户对话，支持内部备注）
- 工单分类（技术问题/售前咨询/投诉建议）
- 工单标签、优先级
- 工单转交、合并

### 客户工作台
- 我的工单列表
- 工单详情与对话历史
- 提交新工单
- 工单评价

### 客服工作台
- 待处理工单列表
- 工单筛选与搜索
- 工单回复
- 工单状态变更
- 工单转交其他客服
- 工单合并

### 通知系统
- 新工单通知
- 客户回复通知
- 工单状态变更通知
- 站内实时通知
