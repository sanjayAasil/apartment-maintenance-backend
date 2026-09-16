import { buildPlan, summary } from './seed-plan.js';
import {
  assertLocalDatabase,
  id,
  Random,
  sixMonthsBefore,
} from './seed-utils.js';
import { validatePlan } from './seed-validate.js';

const end = new Date('2026-09-16T12:00:00Z');

describe('local historical seed generator', () => {
  it('is reproducible with a fixed anchor and random seed', () => {
    expect(buildPlan(end, 'test-hash')).toEqual(buildPlan(end, 'test-hash'));
    expect(id('request', 1)).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/,
    );
    expect(new Random(42).next()).toBe(new Random(42).next());
  });
  it.each([
    '2026-09-16T12:00:00Z',
    '2026-09-16T00:00:00Z',
    '2026-03-31T00:01:00Z',
    '2024-08-31T23:59:00Z',
    '2026-01-01T01:00:00Z',
  ])('validates entire dataset at %s', (value) => {
    expect(() =>
      validatePlan(buildPlan(new Date(value), 'test-hash')),
    ).not.toThrow();
  });
  it('clamps month-end correctly and covers all business tables', () => {
    expect(
      sixMonthsBefore(new Date('2024-08-31T12:00:00Z')).toISOString(),
    ).toBe('2024-02-29T12:00:00.000Z');
    const plan = buildPlan(end, 'test-hash');
    expect(plan.data.users).toHaveLength(60);
    expect(plan.data.requests).toHaveLength(220);
    expect(plan.data.apartments).toHaveLength(48);
    expect(Object.values(plan.data).every((rows) => rows.length > 0)).toBe(
      true,
    );
    const report = summary(plan);
    expect(Object.keys(report.statuses)).toHaveLength(6);
    expect(Object.keys(report.ratings)).toHaveLength(5);
    expect(Object.keys(report.costsByMonth).length).toBeGreaterThanOrEqual(6);
    expect(report.lowStockParts).toBeGreaterThan(0);
    expect(
      plan.data.requests.some(
        (row) =>
          row.status === 'CLOSED' &&
          (row.closedAt as Date).toISOString().startsWith('2026-09'),
      ),
    ).toBe(true);
    expect(
      plan.data.feedback.some((row) =>
        (row.createdAt as Date).toISOString().startsWith('2026-09'),
      ),
    ).toBe(true);
    expect(report.reassignedRequests).toBeGreaterThan(15);
    expect(report.reassignedRequests).toBeLessThan(45);
  });
  it('rejects duplicate identities and skills', () => {
    const plan = buildPlan(end, 'test-hash');
    plan.data.users[1].email = plan.data.users[0].email;
    expect(() => validatePlan(plan)).toThrow('duplicate email');
    const second = buildPlan(end, 'test-hash');
    second.data.skills.push({
      ...second.data.skills[0],
      id: id('invalid-skill', 1),
    });
    expect(() => validatePlan(second)).toThrow('duplicate skill');
  });
  it('rejects stock mismatch, orphan relations and contradictory history', () => {
    const stock = buildPlan(end, 'test-hash');
    stock.data.parts[0].quantity = -1;
    expect(() => validatePlan(stock)).toThrow('stock');
    const orphan = buildPlan(end, 'test-hash');
    orphan.data.requests[0].residentId = id('missing', 0);
    expect(() => validatePlan(orphan)).toThrow('request relations');
    const history = buildPlan(end, 'test-hash');
    history.data.history.find(
      (row) => row.action === 'STATUS_CHANGED',
    )!.oldValue = 'CLOSED';
    expect(() => validatePlan(history)).toThrow('contradictory status history');
  });
  it('rejects multiple active assignments and unrelated comments/feedback', () => {
    const assignment = buildPlan(end, 'test-hash');
    assignment.data.assignments.push({
      ...assignment.data.assignments.find((row) => row.isActive)!,
      id: id('invalid-assignment', 0),
    });
    expect(() => validatePlan(assignment)).toThrow('active assignment');
    const comment = buildPlan(end, 'test-hash');
    comment.data.comments[0].userId =
      comment.data.residents[0].userId === comment.data.comments[0].userId
        ? comment.data.residents[1].userId
        : comment.data.residents[0].userId;
    expect(() => validatePlan(comment)).toThrow('unrelated resident comment');
    const feedback = buildPlan(end, 'test-hash');
    feedback.data.feedback[0].rating = 6;
    expect(() => validatePlan(feedback)).toThrow('feedback rating');
  });
});

describe('seed safety guard', () => {
  it('allows only the expected loopback database', () => {
    expect(
      assertLocalDatabase(
        'postgresql://user:secret@localhost:5432/apartment_maintenance',
      ),
    ).toBe('localhost:5432/apartment_maintenance');
    expect(() =>
      assertLocalDatabase(
        'postgresql://user:secret@remote.test/apartment_maintenance',
      ),
    ).toThrow('remote');
    expect(() =>
      assertLocalDatabase('postgresql://user:secret@localhost/production'),
    ).toThrow('other');
    expect(() =>
      assertLocalDatabase(
        'postgresql://user:secret@localhost/apartment_maintenance',
        'production',
      ),
    ).toThrow('production');
  });
});
