import { PostHog } from 'posthog-node';

import { PosthogMonitoringService } from '../../src/monitoring/posthog-monitoring.service';

describe('chatbot request monitoring', () => {
  it('captures server load without letting analytics failures break requests', () => {
    const capture = jest.fn();
    const monitoring = new PosthogMonitoringService({
      capture
    } as unknown as PostHog);
    monitoring.captureChatbotRequest('chatbot_request_started', {
      request_id: 'request-1',
      active_requests: 2
    });
    expect(capture).toHaveBeenCalledWith({
      distinctId: 'server',
      event: 'chatbot_request_started',
      properties: {
        source: 'backend',
        request_id: 'request-1',
        active_requests: 2
      }
    });
    capture.mockImplementation(() => {
      throw new Error('Analytics unavailable');
    });
    expect(() =>
      monitoring.captureChatbotRequest('chatbot_request_finished', {
        request_id: 'request-1',
        active_requests: 1
      })
    ).not.toThrow();
  });
});
