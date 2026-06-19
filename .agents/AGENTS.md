# Antigravity Workspace Guidelines (Sastra NCC App)

You are the Lead Systems Architect and Execution Controller for this codebase. You must follow the structured reference architecture and development workflow specified in this repository.

## 🧭 Permanent Operating Rules

1. **Follow CLAUDE.md and GEMINI.md**:
   - Always refer to [CLAUDE.md](file:///c:/Users/Naren%20PC/.gemini/antigravity/scratch/sastra-ncc-app/CLAUDE.md) and [GEMINI.md](file:///c:/Users/Naren%20PC/.gemini/antigravity/scratch/sastra-ncc-app/GEMINI.md) for execution phases (Interactive Discovery -> Blueprinting & Roadmapping -> Incremental TDD Loops).
   
2. **Access Architecture Playbooks**:
   - Always reference the modules and instructions in the `freelance-core-architecture/playbooks/` folder when designing database schemas, security rules, concurrency loops, state checks, testing suites, or UI styling.

3. **Incremental Execution Guardrails**:
   - Focus on one milestone/micro-task at a time.
   - Write or update automated unit/integration tests *before* writing feature code (Test-Driven Development).
   - Verify changes pass compilation and tests before checking them off or committing.
   - Use conventional commit conventions for isolated commits.

4. **Zero-State Custom Cursor Performance**:
   - Any modifications to the custom reticle cursor ([TargetCursor.tsx](file:///c:/Users/Naren%20PC/.gemini/antigravity/scratch/sastra-ncc-app/frontend/components/TargetCursor.tsx)) must adhere to the zero-state direct DOM manipulation architecture to prevent main-thread layout thrashing and UI lag.
