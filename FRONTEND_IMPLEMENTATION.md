# Frontend Implementation Notes

## UI Components

- Use `src/components/Select.tsx` for new dropdown UI.
- Prefer `variant="brutalist"` for court-manager operational screens.
- Use `size="compact"` when the dropdown is part of a toolbar, settings row, or dense form.
- Avoid adding native `<select>` elements to new court-manager UI unless there is a specific browser-native reason.

## Operational Screens

- Order information by operating priority: current state, next action, then secondary settings.
- Keep the main workspace focused on the court schedule. Move auxiliary actions into toolbars or modals.
- Use cards only when they define an interaction boundary, such as operation panels, edit toolbars, or dialogs.

## Game Detail Screen

- Basic information should stay compact: title, editable settings, and small meta indicators in one section.
- Schedule editing should use a compact toolbar above the schedule, not a large detached card.
- Participant status should be read-only by default. Participant changes should happen through a management modal.
