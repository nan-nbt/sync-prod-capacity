# Templates README

`.specify/templates/` is the canonical source for all specification templates in this project.

## Main Process Templates

- `spec-template.md`
  - feature-level requirement specification
- `plan-template.md`
  - feature-level technical design and implementation plan
- `tasks-template.md`
  - feature-level task list
- `checklist-template.md`
  - Quality checklist
- `constitution-template.md`
  - Project governance charter

## Supplementary Templates

- `contracts/`
  - Various interface and interaction contract templates
- `tasks/task-detail-template.md`
  - Single task detail template, used only when tasks are complex
- `architect/architecture-spec-template.md`
  - project-level architecture status document template

## Selection Rules

- Requirements always start from `spec-template.md`
- Technical design always goes into `plan-template.md`
- If there are external or cross-component interactions, prioritize selecting templates from `contracts/`
- If `tasks.md` is sufficient, do not create additional `tasks/task-*.md`
- If it's just for a single feature design, do not directly modify `architecture-spec-template.md`

## Maintenance Principles

- New templates should be added to `.specify/templates/` first
- If templates need categorization, prioritize creating subdirectories rather than scattering in the root level
