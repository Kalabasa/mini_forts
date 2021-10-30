Note for Android: NOT TESTED ON ANDROID!

### Interaction system description

This is an attempt to normalize interaction behavior in a central place which would then delegate to appropriate systems. This is the opposite of the Minetest way which is hooking interactions into callbacks in different places and relying on context-dependent behavior (e.g., placing a node repeats, punchinga node does not repeat - we want to standardize these behavior).

The current interaction system for MiniForts combines item tool callbacks, global callbacks, get_player_control() polling, and client-side scripting to achieve a normalized set of user interactions.

The general flow is:

1. Hook into Minetest APIs (on_punch, on_use, control bits, etc.)
2. InteractionController normalizes Minetest API information into "gestures" and manages InteractionModes
   1. InteractionModes define gestures or modes which can have a start, a middle, and an end.
   2. InteractionController and InteractionModes can apply game actions onto the InteractionContext.
3. InteractionContext accepts game actions and produces role-specific results (different for server & for client)
4. Produce game results via Minetest APIs or game APIs (set_node, remove_node, etc)
