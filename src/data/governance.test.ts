import { describe, expect, it } from 'vitest';
import { seenPeople } from './governance';
import type { ProcessRequest } from './governance';

function request(overrides: Partial<ProcessRequest>): ProcessRequest {
  return {
    number: 1,
    title: 'Request',
    url: 'https://example.invalid',
    body: '',
    author: 'octocat',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00Z',
    needsTranslation: false,
    isApproval: false,
    ...overrides,
  };
}

describe('seenPeople', () => {
  it('carries the open approval request, so approving can close it', () => {
    const people = seenPeople([request({ number: 7, isApproval: true })]);
    expect(people).toEqual([
      { login: 'octocat', requestedAt: '2026-01-01T00:00:00Z', approvalIssue: 7 },
    ]);
  });

  it('prefers the approval request over an earlier request of another kind', () => {
    const people = seenPeople([
      request({ number: 3, createdAt: '2026-01-01T00:00:00Z' }),
      request({ number: 9, createdAt: '2026-03-01T00:00:00Z', isApproval: true }),
    ]);
    expect(people).toEqual([
      { login: 'octocat', requestedAt: '2026-03-01T00:00:00Z', approvalIssue: 9 },
    ]);
  });

  it('has nothing to close when the approval request is already handled', () => {
    const people = seenPeople([request({ number: 7, isApproval: true, status: 'accepted' })]);
    expect(people[0].approvalIssue).toBeNull();
  });

  it('still dates someone who only sent a free-text request', () => {
    const people = seenPeople([
      request({ number: 5, createdAt: '2026-02-01T00:00:00Z' }),
      request({ number: 2, createdAt: '2026-01-01T00:00:00Z' }),
    ]);
    expect(people).toEqual([
      { login: 'octocat', requestedAt: '2026-01-01T00:00:00Z', approvalIssue: null },
    ]);
  });

  it('ignores issues with no authenticated author', () => {
    expect(seenPeople([request({ author: null })])).toEqual([]);
  });
});
