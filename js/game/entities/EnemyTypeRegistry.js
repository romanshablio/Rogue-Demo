export class EnemyTypeRegistry {
  constructor() {
    this.types = new Map();
  }

  register(id, definition) {
    this.types.set(id, definition);
  }

  get(id) {
    const definition = this.types.get(id);

    if (!definition) {
      throw new Error(`Enemy type "${id}" is not registered.`);
    }

    return definition;
  }
}
