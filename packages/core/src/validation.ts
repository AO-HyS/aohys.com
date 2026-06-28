export function assertOneOf<T extends string>(
  value: string,
  allowedValues: readonly T[],
  fieldName: string,
): asserts value is T {
  if (!allowedValues.includes(value as T)) {
    throw new Error(`${fieldName} is not supported.`);
  }
}
