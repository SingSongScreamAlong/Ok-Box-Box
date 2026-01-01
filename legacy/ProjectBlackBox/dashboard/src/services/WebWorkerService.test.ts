import { WebWorkerService } from './WebWorkerService';

// Mock Worker implementation
class MockWorker {
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
  postMessage = jest.fn((data) => {
    // Simulate worker processing and response
    if (this.onmessage) {
      setTimeout(() => {
        this.onmessage!({
          data: { 
            id: data.id, 
            result: `Processed: ${JSON.stringify(data.payload)}`,
            error: null
          }
        } as unknown as MessageEvent);
      }, 10);
    }
  });
  terminate = jest.fn();
}

// Mock the Worker constructor
global.Worker = jest.fn().mockImplementation(() => new MockWorker());

describe('WebWorkerService', () => {
  let webWorkerService: WebWorkerService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    webWorkerService = new WebWorkerService();
  });
  
  afterEach(() => {
    webWorkerService.terminate();
  });
  
  test('should initialize with a worker instance', () => {
    expect(global.Worker).toHaveBeenCalled();
    expect(webWorkerService).toBeDefined();
  });
  
  test('should process data through the worker', async () => {
    const testData = { value: 42, name: 'test' };
    const result = await webWorkerService.processData('testOperation', testData);
    
    // Verify worker was called with correct data
    expect(result).toContain('Processed:');
    expect(result).toContain('42');
    expect(result).toContain('test');
    
    const mockWorkerInstance = (global.Worker as jest.Mock).mock.instances[0];
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({
      id: expect.any(String),
      operation: 'testOperation',
      payload: testData
    });
  });
  
  test('should handle multiple concurrent requests', async () => {
    const requests = [
      webWorkerService.processData('op1', { id: 1 }),
      webWorkerService.processData('op2', { id: 2 }),
      webWorkerService.processData('op3', { id: 3 })
    ];
    
    const results = await Promise.all(requests);
    
    expect(results).toHaveLength(3);
    expect(results[0]).toContain('id":1');
    expect(results[1]).toContain('id":2');
    expect(results[2]).toContain('id":3');
  });
  
  test('should handle worker errors', async () => {
    // Override the mock worker to simulate an error
    const mockWorkerInstance = (global.Worker as jest.Mock).mock.instances[0];
    mockWorkerInstance.postMessage = jest.fn((data) => {
      if (mockWorkerInstance.onmessage) {
        setTimeout(() => {
          mockWorkerInstance.onmessage!({
            data: { 
              id: data.id, 
              result: null,
              error: 'Test error'
            }
          } as unknown as MessageEvent);
        }, 10);
      }
    });
    
    await expect(webWorkerService.processData('failOperation', { test: true }))
      .rejects.toEqual('Test error');
  });
  
  test('should terminate the worker when requested', () => {
    webWorkerService.terminate();
    
    const mockWorkerInstance = (global.Worker as jest.Mock).mock.instances[0];
    expect(mockWorkerInstance.terminate).toHaveBeenCalled();
  });
  
  test('should handle timeouts for long-running operations', async () => {
    // Override the mock worker to simulate a timeout
    const mockWorkerInstance = (global.Worker as jest.Mock).mock.instances[0];
    mockWorkerInstance.postMessage = jest.fn(() => {
      // Don't call onmessage to simulate a worker that never responds
    });
    
    // Set a short timeout for testing
    webWorkerService.setTimeout(50);
    
    await expect(webWorkerService.processData('timeoutOperation', { test: true }))
      .rejects.toMatch(/timeout/i);
  });
});
