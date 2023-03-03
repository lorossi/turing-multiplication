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

  _validateInput(n1, n2) {
    if (n1.length + n2.len >= this._tapes_len) return "";
    if (n1.length == 0 || n2.length == 0) return "";

    if (!RegExp("^(0|1)+$").test(n1)) return "";
    if (!RegExp("^(0|1)+$").test(n2)) return "";

    return `${n1}#${n2}`;
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
      const n1 = document.querySelector("#number1");
      const n2 = document.querySelector("#number2");
      const input = this._validateInput(n1.value, n2.value);

      if (input != "") {
        this.setup();
        this._tm.setTapes([input, ""]);
      }

      n1.value = "";
      n2.value = "";
    });

    document.querySelectorAll("[type=numeric]").forEach((e) =>
      e.addEventListener("input", (input) => {
        if (input.data != "1" && input.data != "0")
          input.target.value = input.target.value.slice(0, -1);
      })
    );
  }
}
