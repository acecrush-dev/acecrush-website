/**
 * 手写 tween 工具（plan 003 §3-6 / §4-4）。零依赖。
 *
 * 提供：
 * - easeInOutCubic / easeOutQuart / easeInQuad
 * - TweenGroup（add/update(dt)/clear，onUpdate(t)/onComplete）
 *
 * SceneManager 每帧调 update(dt) 驱动。
 */

export type Easing = (t: number) => number;

export const easeInOutCubic: Easing = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutQuart: Easing = (t) => 1 - Math.pow(1 - t, 4);

export const easeInQuad: Easing = (t) => t * t;

export type TweenOpts = {
  duration: number; // 秒
  easing?: Easing;
  onUpdate: (t: number) => void; // t ∈ [0, 1]
  onComplete?: () => void;
};

export class ActiveTween {
  elapsed = 0;
  done = false;
  constructor(public opts: TweenOpts) {}
}

export class TweenGroup {
  private tweens: ActiveTween[] = [];

  add(opts: TweenOpts): ActiveTween {
    const tw = new ActiveTween(opts);
    this.tweens.push(tw);
    return tw;
  }

  update(dt: number) {
    if (!this.tweens.length) return;
    const remaining: ActiveTween[] = [];
    for (const tw of this.tweens) {
      if (tw.done) continue;
      tw.elapsed += dt;
      const t = Math.min(1, tw.elapsed / tw.opts.duration);
      const eased = tw.opts.easing ? tw.opts.easing(t) : t;
      tw.opts.onUpdate(eased);
      if (t >= 1) {
        tw.done = true;
        tw.opts.onComplete?.();
      } else {
        remaining.push(tw);
      }
    }
    this.tweens = remaining;
  }

  clear() {
    this.tweens = [];
  }
}