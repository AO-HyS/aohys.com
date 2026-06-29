export function assertOneOf<T extends string>(
  value: string,
  allowedValues: readonly T[],
  fieldName: string,
): asserts value is T {
  if (!allowedValues.includes(value as T)) {
    throw new Error(`${fieldName} is not supported.`);
  }
}

export function isOneOf<T extends string>(
  value: string | undefined,
  allowedValues: readonly T[],
): value is T {
  return value !== undefined && allowedValues.includes(value as T);
}
