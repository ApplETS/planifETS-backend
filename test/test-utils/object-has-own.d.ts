declare global {
  interface ObjectConstructor {
    hasOwn(object: object, property: PropertyKey): boolean;
  }
}

export { };
