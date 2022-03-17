class Sketch extends Engine {
  preload() {
    this._scl = 0.95;
  }

  setup() {
    this._tm = new TuringMachine(this.width / 2, 2, 33);

    const input = "10#100";
    this._tm.setTapes([input, ""]);
  }

  draw() {
    if (this._tm.ended || this._tm.error) return;

    this._tm.update(this.frameCount);

    this.ctx.save();
    this.background("#0E0E0E");
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(this._scl, this._scl);

    this._tm.show(this.ctx);

    this.ctx.restore();
  }
}
