class Sketch extends Engine {
  preload() {
    this._scl = 0.95;
    this._tapes_len = 34;
    this._animation_duration = 10;
    this._frame_delay = 0;
    this._paused = false;
    this._recording = false;

    // selectors for DOM elements
    this._speed_slider = document.querySelector("#speed");
    this._pause_button = document.querySelector("#pause");
    this._reset_button = document.querySelector("#reset");
    this._compute_button = document.querySelector("#compute");
    this._input_fields = document.querySelectorAll("[type=numeric]");

    this._setCallbacks();
    this._resetDOM();
  }

  setup() {
    if (this._recording) this._setSpeed(80);
    else this._setSpeed(this._readSpeed());

    this._tm = new TuringMachine(this.width / 2, 2, this._tapes_len);
    const n1 = this._recording
      ? this._createInput(8, 0.15)
      : this._createInput(16, 0.5);
    this._tm.setTapes([n1, ""]);

    if (this._recording) this.startRecording();
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

    if (this._recording && this._tm.ended) {
      this.stopRecording();
      this.saveRecording();
    }
  }

  /**
   *
   * @param {number} speed in range [1, 100]
   * @param {number} min_duration minimum duration of the animation in frames
   * @param {number} max_duration maximum duration of the animation in frames
   */
  _setSpeed(speed, min_duration = 2, max_duration = 60) {
    const new_duration = Math.floor(
      (1 - speed / 100) * (max_duration - min_duration) + min_duration
    );

    this._writeSpeed(speed);
    this._animation_duration = new_duration;
  }

  /**
   * Create two random binary numbers of length len, separated by a # symbol
   *
   * @param {number} len length of the binary number
   * @param {number} p probability of a 1 in the binary number
   * @returns
   */
  _createInput(len, p) {
    const random_binary = (ll, pp) => {
      let s = "1";
      while (s.length < ll) {
        s += Math.random() < pp ? "1" : "0";
      }
      return s;
    };

    return `${random_binary(len, p)}#${random_binary(len, p)}`;
  }

  /**
   * Validate the input of the user
   *
   * @param {string} n1 first number
   * @param {string} n2 second number
   * @returns {string} the validated input (n1#n2)
   * @returns {string} empty string if the input is invalid
   */
  _validateInput(n1, n2) {
    if (n1.length + n2.len >= this._tapes_len) return "";
    if (n1.length == 0 || n2.length == 0) return "";

    if (!RegExp("^(0|1)+$").test(n1)) return "";
    if (!RegExp("^(0|1)+$").test(n2)) return "";

    return `${n1}#${n2}`;
  }

  /**
   * READ the speed from the slider
   *
   * @returns {number} the current speed of the animation
   */
  _readSpeed() {
    let v = this._speed_slider.value;
    if (isNaN(v)) return 50;
    // clamp the value between 0 and 100
    return Math.min(Math.max(v, 0), 100);
  }

  /**
   * WRITE the speed to the slider
   *
   * @param {number} speed the speed to write
   */
  _writeSpeed(speed) {
    this._speed_slider.value = speed;
  }

  /**
   * Set the callbacks for the DOM elements
   */
  _setCallbacks() {
    this._speed_slider.addEventListener("change", (e) =>
      this._setSpeed(e.target.value)
    );

    this._pause_button.addEventListener("click", (e) => {
      this._paused = !this._paused;
      if (this._paused) e.target.innerHTML = "run";
      else e.target.innerHTML = "pause";
    });

    this._reset_button.addEventListener("click", () => this.setup());

    this._compute_button.addEventListener("click", () => {
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

    this._input_fields.forEach((e) =>
      e.addEventListener("input", (input) => {
        if (input.data != "1" && input.data != "0")
          input.target.value = input.target.value.replace(/[^0-1]/g, "");
      })
    );
  }

  _resetDOM() {
    this._speed_slider.value = 50;
    this._input_fields.forEach((e) => (e.value = ""));
  }
}
