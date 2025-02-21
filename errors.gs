class UnknownPropertyError extends Error {
  constructor(prop) {
    super(`Attempt to access missing property ${prop}`);
    this.name = "Invalid property";
    this.prop = prop
  }
}
class UnexpectedTypeError extends Error {
  constructor(expectedType, actualType) {
    super(`Expected ${expectedType} but got ${actualType}`);
    this.name = "Unexpected type";
    this.expectedType = expectedType
    this.actualType = actualType
  }
}
class UnexpectedValueError extends Error {
  constructor(expectedValue, actualValue) {
    super(`Actual: ${JSON.stringify(actualValue)} Expected: ${JSON.stringify(expectedValue)}`);
    this.name = "Unexpected value";
    this.expectedValue = expectedValue
    this.actualValue = actualValue
  }
}
// hoist for exports
const newUnknownPropertyError = (prop) => new UnknownPropertyError(prop)
const newUnexpectedTypeError = (expectedType, actualType) => new  UnexpectedTypeError(expectedType, actualType)
const newUnexpectedValueError = (expectedValue, actualValue) => new  UnexpectedValueError(expectedValue, actualValue)
