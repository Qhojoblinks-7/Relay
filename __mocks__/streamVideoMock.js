const mockCall = {
  join: jest.fn().mockResolvedValue(undefined),
  leave: jest.fn().mockResolvedValue(undefined),
  microphone: {
    enable: jest.fn().mockResolvedValue(undefined),
    disable: jest.fn().mockResolvedValue(undefined),
    enableNoiseCancellation: jest.fn().mockResolvedValue(undefined),
    disableNoiseCancellation: jest.fn().mockResolvedValue(undefined),
    enabled: true,
  },
  state: {
    localParticipant$: { subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) },
    remoteParticipants$: { subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) },
    remoteParticipants: [],
    mediaStream: null,
  },
  mediaStream: null,
};

const mockStreamVideoClient = {
  getOrCreateInstance: jest.fn(() => ({
    disconnectUser: jest.fn().mockResolvedValue(undefined),
    call: jest.fn(() => mockCall),
    state: { connectedUser: { id: 'test-user' } },
  })),
};

const mockStreamVideo = jest.fn(() => ({
  call: jest.fn(() => mockCall),
}));

module.exports = {
  StreamVideoClient: mockStreamVideoClient,
  StreamVideo: mockStreamVideo,
  __mockCall: mockCall,
};
