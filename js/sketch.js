class Sketch extends Engine {
  preload() {
    this._scl = 0.8;
  }

  setup() {
    this._tm = new Automaton(this.width / 2);
  }

  draw() {
    this._tm.update(this.frameCount);

    this.ctx.save();
    this.background("#FFFFFF");
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(this._scl, this._scl);

    this._tm.show(this.ctx);

    this.ctx.restore();
  }

  click() {
    this._tm.stepDisk();
  }
}
