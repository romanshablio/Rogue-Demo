export class AnimationManager {
  constructor(windowObject = globalThis.window || null) {
    this.window = windowObject;
    this.entityAnimations = new Map();
  }

  playEntity(entityKey, animationName, durationMs = 240) {
    if (!entityKey) {
      return;
    }

    this.entityAnimations.set(entityKey, {
      className: `anim-${animationName}`,
    });

    if (!this.window) {
      return;
    }

    this.window.setTimeout(() => {
      const activeAnimation = this.entityAnimations.get(entityKey);
      if (activeAnimation?.className === `anim-${animationName}`) {
        this.entityAnimations.delete(entityKey);
      }
    }, durationMs);
  }

  getEntityAnimationClasses(entityKey) {
    const animation = this.entityAnimations.get(entityKey);
    return animation ? [animation.className] : [];
  }

  clearAll() {
    this.entityAnimations.clear();
  }
}
