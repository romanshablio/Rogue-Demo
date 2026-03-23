export class LevelRegistry {
  constructor() {
    this.levels = new Map();
  }

  register(id, factory) {
    this.levels.set(id, factory);
  }

  create(id, context) {
    const factory = this.levels.get(id);

    if (!factory) {
      throw new Error(`Level "${id}" is not registered.`);
    }

    return factory(context);
  }
}
