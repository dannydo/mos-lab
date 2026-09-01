# 🚀 mos-lab — MasterOS Living Lab

> Build fast, test on real business, iterate biz rules, port to MasterOS.

## What is this?

A living lab where MasterOS features are prototyped and tested on real businesses before being promoted to production.

**First tenant**: Wings Lashes (40K customers, 10+ staff)

## Tech Stack

| Layer     | Technology                          |
| :-------- | :---------------------------------- |
| Frontend  | Next.js 16 + Ant Design 5           |
| Backend   | Fastify 5 + TypeScript              |
| ORM       | Prisma                              |
| Database  | MariaDB (legacy reads + CRM writes) |
| Monorepo  | Turborepo + pnpm                    |
| Deploy FE | Vercel (lab.masteros.app)           |
| Deploy BE | PM2 on VPS                          |

## Domain

- **Lab**: https://lab.masteros.app
- **API**: https://lab.masteros.app/api

## Strategy

```
Build → Launch → Explode 💥 → Learn → Fix → Repeat
```

When biz rules are proven → Port to MasterOS (masteros.app)

## Wiki & Tài liệu

Hệ thống tài liệu hướng dẫn và vận hành của dự án:

- [Development & AI Agent Quickstart](docs/DEVELOPMENT.md) — Package map, canonical commands, and verification workflow.
- [Kiến trúc hệ thống](docs/ARCHITECTURE.md) — Sơ đồ luồng dữ liệu, Tech stack và mô tả Database.
- [Cấu hình & Biểu phí OmiCall](docs/wiki/omicall_reference.md) — Chi tiết cấu hình các hotline Viettel SIP Trunk và đơn giá cước thoại.
- [Tech Stack chi tiết](docs/TECH_STACK.md) — Các công nghệ sử dụng trong monorepo.
