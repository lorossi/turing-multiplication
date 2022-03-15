const TAPE_LEN = 25;
const TAPES_NUM = 2;
const ANIMATION_DURATION = 30;
const ALPHABET = ["0", "1", "#", " "];
const WHITE = "#F5F5F5";
const BLACK = "#0E0E0E";

/**
 * Polygonal in out easing
 */
const polyInOutEase = (x, n = 10) => {
  if (x < 0.5) return Math.pow(2, n - 1) * Math.pow(x, n);
  return 1 - Math.pow(-2 * x + 2, n) / 2;
};

/**
 * Non symmetric in out polygonal ease
 */
const absInOutEase = (x, ni = 5, no = 5) => {
  if (x < 0.5) return Math.pow(2, ni - 1) * Math.pow(x, ni);
  return 1 - Math.pow(-2 * x + 2, no) / 2;
};

/**
 * Polynomial out easing
 */
const polyInEase = (x, n = 5) => Math.pow(x, n);

/**
 * Decimal - Hexadecimal conversion
 */
const dec_to_hex = (dec, padding = 0, prefix = false, round = true) => {
  if (round) dec = Math.floor(dec);
  let hex = dec.toString(16).padStart(padding, 0).toUpperCase();
  if (prefix) hex = "0x" + hex;
  return hex;
};

class Automaton {
  constructor(size) {
    this._size = size;
    this._current_frame = 0;
    this._ended = false;
    this._error = false;

    const disk_width = this._size / TAPES_NUM / 2;
    const disk_spacing = disk_width / 2;

    // instantiate all the K tapes
    this._tapes = Array(TAPES_NUM)
      .fill(null)
      .map((_, i) => {
        const disk_r = this._size - (disk_spacing + disk_width) * i;
        return new CircularTape(disk_r, disk_width);
      })
      .reverse();

    // instantiate the heads
    this._heads = Array(TAPES_NUM)
      .fill(null)
      .map((_, i) => new Head(this._tapes[i]._r, disk_width / 5));

    // instantiate the FSA controlling the TM
    this._fsa = new FSA(this._size / 2);
  }

  /**
   * Set the tapes content
   * @param {Array} contents: array of strings
   */
  setTapes(contents) {
    contents.forEach((c, i) => this._tapes[i].setTape(c.split("")));
  }

  /**
   *
   * @param {int} current_frame
   */
  update(current_frame) {
    if (this._error || this._ended) return;
    // save the current frame, needed for animations
    this._current_frame = current_frame;

    // update the FSA and each frame
    this._fsa.update(current_frame);
    if (this._fsa.error) {
      this._error = true;
    }
    this._tapes.forEach((t) => t.update(current_frame));

    // check if the fsa has ended
    if (this._fsa.ended) {
      this._ended = true;
      return;
    }

    // check if all animations are not running
    if (this._tapes.every((t) => !t.is_animating && !this._fsa.is_animating)) {
      // step the FSA and get tape movements and new tapes characters
      const updates = this._fsa.step(this.current_chars);
      // there are updates, update each tape
      if (updates) {
        this._tapes.forEach((t, i) =>
          t.setAnimation(
            updates.new_chars.charAt(i),
            updates.directions.charAt(i)
          )
        );
      }
    }
  }

  show(ctx) {
    // show all tapes , heads and FSA
    ctx.save();
    this._tapes.forEach((d) => d.show(ctx));
    this._heads.forEach((h) => h.show(ctx));
    this._fsa.show(ctx);
    ctx.restore();
  }

  /**
   * Get chars under each head as a string
   * @returns String
   */
  get current_chars() {
    return this._tapes.reduce((a, b) => a + b.getCurrentChar().toString(), "");
  }

  /**
   * Set chars under each head as a string
   * @param {String} chars
   */
  set current_chars(chars) {
    chars.forEach((c, i) => {
      if (ALPHABET.contains(c)) this._tapes[i].current_char = c;
    });
  }

  get error() {
    return this._error;
  }

  get ended() {
    return this._ended;
  }
}

/**
 * Class handling a single state
 */
class State {
  constructor(name, initial = false, final = false) {
    this.name = name;
    this.initial = initial;
    this.final = final;
  }
}

/**
 * Class handling transitions between states
 */
class Transition {
  constructor(from_state, to_state, chars, new_chars, directions) {
    this.from_state = from_state;
    this.to_state = to_state;
    this.chars = chars;
    this.new_chars = new_chars;
    this.directions = directions;
  }
}

class FSA {
  constructor(size) {
    this._size = size;
    this._ended = false; // automaton has stopped after having reached error or end state
    this._error = false; // automaton has reached error state
    this._animation_started = 0;
    this._is_animating = false;
    // opacity relative to the current state
    this._current_opacity = 255;

    // https://www.quora.com/How-do-you-use-a-Turing-machine-to-multiply-2-3

    // Initialize all the states
    this._states = [
      new State("q0", true, false), // replace space
    ];
    // Initialize all the transitions
    this._transitions = [];

    if (this._states.length == 0) {
      this._error = true;
      this._current_opacity = null;
    } else {
      // select the initial state
      this._current_state = this._states.filter((s) => s.initial)[0];
    }
  }

  _findTransition(chars) {
    const transitions = this._transitions
      .filter((t) => t.from_state == this._current_state.name)
      .filter((t) => t.chars == chars);

    if (transitions.length != 1) return null;
    return transitions[0];
  }

  _findNextState(name) {
    const state = this._states.filter((s) => s.name == name);

    if (state.length != 1) return null;
    return state[0];
  }

  step(chars) {
    // don't step if the animation is not yet ended
    if (this._ended || this._is_animating) return;

    // look for next transition
    const next_transition = this._findTransition(chars);
    // no transitions found! exit
    if (next_transition == null) {
      this._ended = true;
      this._error = true;
      console.log("No transition found");
      return;
    }
    const next_state = this._findNextState(next_transition.to_state);
    // no next state found! exit
    if (next_state == null) {
      this._ended = true;
      this._error = true;
      console.log("No state found");
      return;
    }

    // update the current state
    this._current_state = next_state;
    console.log(this._current_state);

    // a final state has been reached
    if (this._states.filter((s) => this._current_state.name == s.name)[0].final)
      this._ended = true;

    // set the animation to true
    this._is_animating = true;
    this._animation_started = this._current_frame;
    this._current_opacity = 0;

    return {
      new_chars: next_transition.new_chars,
      directions: next_transition.directions,
    };
  }

  update(current_frame) {
    this._current_frame = current_frame;

    if (!this._is_animating) return;

    // calculate elapsed time from animation start
    const elapsed = current_frame - this._animation_started;
    // end animation if enough time has been elapsed
    if (elapsed > ANIMATION_DURATION) {
      this._is_animating = false;
      return;
    }

    // calculate current state opacity
    const percent = elapsed / ANIMATION_DURATION;
    this._current_opacity = polyInEase(percent, 4) * 255;
  }

  show(ctx) {
    const theta = (Math.PI * 2) / this._states.length;
    // there's a lower bound on the state size
    const state_size = Math.min(
      this._size / 10,
      (Math.PI * 2 * this._size) / 2 / this._states.length
    );

    ctx.save();

    ctx.strokeStyle = WHITE;
    ctx.beginPath();
    ctx.arc(0, 0, this._size / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    this._states.forEach((s) => {
      // draw each state around the circle
      ctx.rotate(theta);
      ctx.beginPath();
      ctx.arc(0, this._size / 3, state_size, 0, Math.PI * 2);
      // if this is the current state, fill it opaquely
      ctx.stroke();
      if (s.name == this._current_state.name) {
        const hex_opacity = dec_to_hex(this._current_opacity);
        ctx.fillStyle = WHITE + hex_opacity;
        ctx.fill();
        ctx.stroke();
      }
    });
    ctx.restore();

    ctx.restore();
  }

  get is_animating() {
    return this._is_animating;
  }

  get ended() {
    return this._ended && !this._is_animating;
  }

  get error() {
    // is the FSA in an error state?
    return this._error;
  }
}

/** this class does nothing computation wise, it's just for showing */
class Head {
  constructor(dist, size) {
    this._dist = dist;
    this._size = size;
    this._span = (Math.PI * 2) / TAPE_LEN / 4;
  }

  show(ctx) {
    ctx.save();
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = WHITE;

    ctx.beginPath();

    ctx.arc(0, 0, this._dist, -this._span / 2, this._span / 2);
    ctx.lineTo(this._dist - this._size, 0);

    ctx.fill();
    ctx.restore();
  }
}

/** Class handling the tape */
class CircularTape {
  constructor(r, width) {
    this._r = Math.floor(r);
    this._inner_r = Math.floor(r - width);

    // fill the tape with blank characters
    this._tape = Array(TAPE_LEN)
      .fill(null)
      .map((_) => ALPHABET[ALPHABET.length - 1]);
    // convert directions in formal way to direction
    this._directions_map = { R: 1, L: -1, S: 0 };

    this._current_frame = 0;
    this._current_pos = 0;

    this._current_rotation = 0;
    this._current_opacity = 255;
    this._char_changed = false;

    this._is_animating = false;
    this._animation_started = 0;

    this._step_direction = 0;
    this._new_char = "";
  }

  setTape(tape) {
    // copy the tapes, filling with enough spaces
    this._tape = [...tape];
    for (let i = tape.length; i < TAPE_LEN; i++)
      this._tape.push(ALPHABET[ALPHABET.length - 1]);
  }

  setAnimation(new_char, step_direction) {
    // set the animation with the new char and the step direction
    this._is_animating = true;
    this._animation_started = this._current_frame;
    this._new_char = new_char;
    this._step_direction = this._directions_map[step_direction];
  }

  update(current_frame) {
    this._current_frame = current_frame;

    if (this._is_animating) {
      const diff = this._current_frame - this._animation_started;
      const percent = (diff / ANIMATION_DURATION) % 1;

      if (diff < ANIMATION_DURATION) {
        // animate the char
        if (this._new_char != this.getCurrentChar()) {
          this.setCurrentChar(this._new_char);
          this._char_changed = true;
        }
        this._current_opacity = polyInEase(percent) * 255;
      } else if (diff < 2 * ANIMATION_DURATION) {
        // animate the rotation
        this._current_rotation =
          ((absInOutEase(percent, 4, 10) * Math.PI * 2) / TAPE_LEN) *
          this._step_direction;
      } else {
        this._is_animating = false;
        this._char_changed = false;
        this._current_pos += this._step_direction;
        this._current_rotation = 0;
      }
    }
  }

  show(ctx) {
    ctx.save();

    ctx.fillStyle = BLACK;
    ctx.strokeStyle = WHITE;

    // fill main disk
    ctx.beginPath();
    ctx.arc(0, 0, this._r, 0, 2 * Math.PI, true);
    ctx.closePath();
    ctx.arc(0, 0, this._inner_r, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.fill();

    // stroke inner disk
    ctx.beginPath();
    ctx.arc(0, 0, this._inner_r, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.stroke();

    // stroke outer disk
    ctx.beginPath();
    ctx.arc(0, 0, this._r, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();

    const font_size = Math.floor((this._r - this._inner_r) / 2);
    const text_dist = Math.floor((this._r + this._inner_r - font_size) / 2);
    const spacing = (Math.PI * 2) / TAPE_LEN;

    ctx.font = `${font_size}px Courier New`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const current_rotation = spacing * this._current_pos;

    ctx.save();
    ctx.rotate(this._current_rotation - spacing / 2 + current_rotation);

    this._tape.forEach((t, i) => {
      ctx.save();
      ctx.strokeStyle = WHITE;
      // draw divisions
      ctx.rotate(-spacing * i);
      ctx.beginPath();
      ctx.moveTo(0, this._inner_r);
      ctx.lineTo(0, this._r);
      ctx.stroke();

      if (this._char_changed && this._getCurrentPos() == i) {
        const hex_opacity = dec_to_hex(this._current_opacity);
        ctx.fillStyle = WHITE + hex_opacity;
      } else {
        ctx.fillStyle = WHITE;
      }
      // write number on each section
      ctx.rotate(spacing / 2);

      ctx.fillText(t, 0, text_dist);
      ctx.restore();
    });

    ctx.restore();
  }

  _getCurrentPos() {
    let pos = this._current_pos;

    while (pos < 0) pos += TAPE_LEN;
    while (pos >= TAPE_LEN) pos -= TAPE_LEN;

    return pos;
  }

  getCurrentChar() {
    const pos = this._getCurrentPos();
    return this._tape[pos];
  }

  setCurrentChar(char) {
    if (!ALPHABET.includes(char)) return;

    const pos = this._getCurrentPos();
    this._tape[pos] = char;
  }

  get is_animating() {
    return this._is_animating;
  }
}
