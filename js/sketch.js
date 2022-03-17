class Sketch extends Engine {
  preload() {
    this._scl = 0.95;
    this._tapes_len = 34;
    this._animation_duration = 30;
    this._frame_delay = 0;
    this._paused = false;

    this._setCallbacks();
  }

  setup() {
    this._tm = new TuringMachine(this.width / 2, 2, this._tapes_len);

    const n1 = this._createInput(16);
    this._tm.setTapes([n1, ""]);
  }
  draw() {
    if (this._paused) {
      this._frame_delay++;
      return;
    }

    if (this._tm.ended || this._tm.error) return;

    const elapsed_frames = this.frameCount - this._frame_delay;
    this._tm.update(elapsed_frames, this._animation_duration);

    this.ctx.save();
    this.background("#0E0E0E");
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(this._scl, this._scl);

    this._tm.show(this.ctx);

    this.ctx.restore();
  }

  _setSpeed(speed, min_duration = 2, max_duration = 120) {
    const new_duration = Math.floor(
      (1 - speed / 100) * (max_duration - min_duration) + min_duration
    );
    this._animation_duration = new_duration;
  }

  _createInput(len) {
    const populate_array = (len) =>
      Array(len)
        .fill(null)
        .map((_) => (Math.random() > 0.5 ? 0 : 1));

    return `${populate_array(len)}#${populate_array(len)}`;
  }

  _validateInput(input) {
    if (input.length >= this._tapes_len) return false;

    if (input.split("").reduce((a, b) => (a += b == "#" ? 1 : 0), 0) != 1)
      return false;

    if (input.split("#").some((i) => i.length == 0)) return false;

    return true;
  }

  _setCallbacks() {
    document
      .querySelector("#speed")
      .addEventListener("change", (e) => this._setSpeed(e.target.value));

    document.querySelector("#pause").addEventListener("click", (e) => {
      this._paused = !this._paused;
      if (this._paused) e.target.innerHTML = "run";
      else e.target.innerHTML = "pause";
    });

    document
      .querySelector("#reset")
      .addEventListener("click", () => this.setup());

    document.querySelector("#compute").addEventListener("click", () => {
      const input = document.querySelector("#input");
      const new_tape = input.value;
      input.innerHTML = "";
      if (this._validateInput(new_tape)) {
        this.setup();
        this._tm.setTapes([new_tape.replace("*", "#"), ""]);
      }
    });
  }
}
