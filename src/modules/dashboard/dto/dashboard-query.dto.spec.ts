import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DashboardQueryDto } from './dashboard-query.dto.js';

describe('DashboardQueryDto', () => {
  it('accepts optional calendar dates', async () => {
    expect(await validate(plainToInstance(DashboardQueryDto, {}))).toHaveLength(
      0,
    );
    expect(
      await validate(
        plainToInstance(DashboardQueryDto, {
          from: '2026-09-01',
          to: '2026-09-30',
        }),
      ),
    ).toHaveLength(0);
  });
  it.each(['bad', '2026-02-30', '2026-09-01T12:00:00Z'])(
    'rejects invalid calendar-date input %s',
    async (from) => {
      expect(
        await validate(plainToInstance(DashboardQueryDto, { from })),
      ).not.toHaveLength(0);
    },
  );
});
