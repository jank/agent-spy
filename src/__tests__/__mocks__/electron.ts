// Stub for electron module in unit tests
export const app = {
  getPath: (name: string) => `/tmp/agent-spy-test/${name}`,
  getName: () => 'Agent Spy',
  setName: () => {},
  name: 'Agent Spy',
};
