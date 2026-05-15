# RallyOn Frontend Agent Guide

This file contains frontend-specific operating guidance for agents working in
`frontend/`. Cross-repository rules still come from the workspace root
`AGENTS.md`.

## Scope

- This repository is the RallyOn Next.js frontend.
- Keep UI changes focused on the requested route or component.
- Do not change backend API contracts, request payloads, or route semantics from
  the frontend unless the user explicitly asks for that cross-repository change.

## Commands

- Use `npm run lint` for the default frontend verification.
- Use `npm run build` when the change affects routing, shared components, data
  fetching, or production behavior.
- For local browser verification, run the frontend through infra commands:
  `cd ../infra && make up-live fe`.

## UI Implementation Rules

- Preserve the RallyOn visual language: brutalist borders, strong typography,
  dark header treatment, and emerald accent usage.
- Prefer mobile-first layout decisions. Keep primary actions visible and avoid
  horizontal overflow at small viewport widths.
- Maintain a minimum 44px touch target for mobile icon buttons and primary
  interactive controls.
- Keep changes surgical. Do not refactor adjacent screens, state flows, or
  styling systems unless the task requires it.
- Reuse existing UI primitives before introducing new ones.

## Preferred Existing Components

- Use `src/components/Select.tsx` for custom dropdowns instead of native
  `select` when the screen already uses RallyOn styled controls.
- Use `src/components/ui/session-date-time-picker.tsx` for date/time selection.
- Use `src/components/court/BadmintonCourt.tsx` for court visualization.
- Use `src/components/court-manager/CourtAssignmentWorkbench.tsx` for free-game
  court assignment flows.
- Use `src/components/court-manager/ParticipantManagementPanel.tsx` for
  participant add/list management flows.

## Verification Checklist

- For Court Manager creation changes, check `/court-manager/create`.
- For game operation changes, check `/court-manager/game/:id`.
- For profile onboarding changes, check `/profile/setup`.
- Verify mobile widths before desktop polish when a screen is operational or
  form-heavy.
- Confirm modals and sheets keep scroll contained inside the dialog/sheet.

## Safety

- Do not print or commit raw secrets, cookies, tokens, private keys, or `.env`
  values.
- Do not commit accidental package lock changes unless dependency changes were
  intentional.
- Do not revert user changes or unrelated work in this repository.
