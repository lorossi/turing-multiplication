class Sketch extends Engine {
  preload() {
    this._scl = 0.95;
  }

  setup() {
    this._tm = new Automaton(this.width / 2);

    const input = Array(24)
      .fill(null)
      .map((_) => (Math.random() > 0.5 ? 1 : 0))
      .join("");

    console.log(input);

    this._tm.setTapes([input, "", ""]);
  }

  draw() {
    this._tm.update(this.frameCount);

    this.ctx.save();
    this.background("#0E0E0E");
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(this._scl, this._scl);

    this._tm.show(this.ctx);

    this.ctx.restore();
  }

  click() {
    //this._tm.stepDisks();
  }

  keyPress(key, code) {
    console.log("key press", { key, code });
  }
}
