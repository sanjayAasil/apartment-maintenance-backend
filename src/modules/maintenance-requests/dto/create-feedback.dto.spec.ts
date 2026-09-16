import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFeedbackDto } from './create-feedback.dto.js';

describe('CreateFeedbackDto', () => {
  it.each([1, 5])('accepts rating %s', async (rating) => {
    const errors = await validate(
      plainToInstance(CreateFeedbackDto, { rating, comment: ' Helpful ' }),
    );
    expect(errors).toHaveLength(0);
  });

  it.each([0, 6, 2.5])('rejects invalid rating %s', async (rating) => {
    const errors = await validate(
      plainToInstance(CreateFeedbackDto, { rating }),
    );
    expect(errors).not.toHaveLength(0);
  });

  it('allows an omitted comment and trims a supplied comment', async () => {
    const withoutComment = plainToInstance(CreateFeedbackDto, { rating: 4 });
    expect(await validate(withoutComment)).toHaveLength(0);
    const withComment = plainToInstance(CreateFeedbackDto, {
      rating: 4,
      comment: ' Fixed well. ',
    });
    expect(withComment.comment).toBe('Fixed well.');
  });
});
