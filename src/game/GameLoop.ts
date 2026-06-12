export class GameLoop {
  private running = false;
  private lastTime = 0;
  private accumulator = 0;
  private readonly fixedDt = 1 / 60;
  private rafId = 0;

  start(update: (dt: number) => void, render: () => void): void {
    this.running = true;
    this.lastTime = performance.now();

    const frame = (now: number) => {
      if (!this.running) return;
      const frameTime = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.accumulator += frameTime;

      while (this.accumulator >= this.fixedDt) {
        update(this.fixedDt);
        this.accumulator -= this.fixedDt;
      }

      render();
      this.rafId = requestAnimationFrame(frame);
    };

    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
