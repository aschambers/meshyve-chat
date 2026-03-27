const socketMock = {
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('@/lib/socket', () => ({
  getSocket: () => socketMock,
}));

export default socketMock;
