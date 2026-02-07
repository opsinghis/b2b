# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **🚀 Quick Start:** Read `.claude/CONTEXT.md` first for immediate application understanding (modules, patterns, decisions). This reduces context-building time significantly.

## Project Overview

**B2B API** — Backend API service for the B2B Operations Platform. Built with NestJS, providing REST APIs.

## Development Methodology

This project uses the **Hybrid Lisa/Ralph Loop** approach.

**Key Files:**
- **`.claude/CONTEXT.md`** — **READ THIS FIRST** - Application context summary
- `.claude/planning/spec.md` — Feature specifications
- `.claude/planning/plan.md` — Implementation patterns
- `.claude/execution/prd.json` — PRD items with completion criteria

## Building from Scratch

This project is built entirely from PRD definitions using Ralph Loop:

```bash
./.claude/ralph.sh
```

All code, configs, and infrastructure are generated based on PRD completion criteria.

