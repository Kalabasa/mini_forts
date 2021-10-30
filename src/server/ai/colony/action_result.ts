export enum ActionResult {
  Ongoing, // agent is doing the action
  Done, // agent has completed the action
  Stopped, // not currently possible for the agent
  Impossible, // action is categorically not possible for any agent
}
