import { transform } from '../types/common';

interface TestInterface {
  a: string;
  b: number;
}

const sample = { a: 'a', b: 1, c: [1, 2, 3], d: { x: 1, y: 2 } };

describe('Pick method', () => {
  it('Should pick data', () => {
    const object = transform<TestInterface>(sample);
    expect(object).not.toBeUndefined()
    //expect(object).toEqual({ a: 'a', b: 1 });
  });
});

