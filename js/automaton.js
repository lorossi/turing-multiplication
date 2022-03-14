const TAPE_LEN = 25;
const TAPES_NUM = 3;
const ANIMATION_DURATION = 30;
const ALPHABET = ["0", "1", "#", " "];

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

    const disk_width = this._size / TAPES_NUM / 2;
    const disk_spacing = disk_width / 2;

    this._tapes = Array(TAPES_NUM)
      .fill(null)
      .map((_, i) => {
        const disk_r = this._size - (disk_spacing + disk_width) * i;
        return new CircularTape(disk_r, disk_width);
      })
      .reverse();

    this._heads = Array(TAPES_NUM)
      .fill(null)
      .map((_, i) => new Head(this._tapes[i]._r, disk_width / 5));

    this._fsa = new FSA(this._size / 2);
  }

  setTapes(contents) {
    contents.forEach((c, i) => this._tapes[i].setTape(c.split("")));
  }

  update(current_frame) {
    this._current_frame = current_frame;

    this._tapes.forEach((t) => t.update(current_frame));

    if (this._tapes.every((t) => !t.is_animating && !this._fsa.ended)) {
      const updates = this._fsa.update(this.current_chars);

      if (updates) {
        this._tapes.forEach((t, i) =>
          t.setAnimation(
            updates.new_chars.split("")[i],
            updates.directions.split("")[i]
          )
        );
      }
    }
  }

  show(ctx) {
    ctx.save();
    this._tapes.forEach((d) => d.show(ctx));
    this._heads.forEach((h) => h.show(ctx));
    this._fsa.show(ctx);
    ctx.restore();
  }

  get current_chars() {
    return this._tapes.reduce((a, b) => a + b.getCurrentChar().toString(), "");
  }

  set current_chars(chars) {
    chars.forEach((c, i) => {
      this._tapes[i].current_char = c;
    });
  }
}

class State {
  constructor(name, initial = false, final = false) {
    this.name = name;
    this.initial = initial;
    this.final = final;
  }
}

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
    this._ended = false;

    this._states = [new State("q0", true, false), new State("q1", false, true)];
    this._transitions = [
      new Transition("q0", "q0", "0  ", "000", "RRR"),
      new Transition("q0", "q0", "1  ", "111", "RRR"),
    ];

    this._current_state = this._states.filter((s) => s.initial)[0].name;
  }

  update(chars) {
    if (this._ended) return;

    const transitions = this._transitions.filter(
      (t) => t.from_state == this._current_state && t.chars == chars
    );

    if (transitions.length != 1) return;

    this._current_state = transitions[0].to_state;

    if (
      this._states.filter((s) => this._current_state == s.name && s.final)
        .length > 0
    )
      this._ended = true;

    return {
      new_chars: transitions[0].new_chars,
      directions: transitions[0].directions,
    };
  }

  show(ctx) {
    ctx.save();
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.arc(0, 0, this._size / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  get ended() {
    return this._ended;
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
    ctx.fillStyle = "black";

    ctx.beginPath();

    ctx.arc(0, 0, this._dist, -this._span / 2, this._span / 2);
    ctx.lineTo(this._dist - this._size, 0);

    ctx.fill();
    ctx.restore();
  }
}

class CircularTape {
  constructor(r, width) {
    this._r = Math.floor(r);
    this._inner_r = Math.floor(r - width);

    this._tape = Array(TAPE_LEN)
      .fill(null)
      .map((_) => ALPHABET[ALPHABET.length - 1]);

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
    this._tape = [...tape].fill(" ", tape.length, TAPE_LEN);
    for (let i = tape.length; i < TAPE_LEN; i++)
      this._tape.push(ALPHABET[ALPHABET.length - 1]);
  }

  setAnimation(new_char, step_direction) {
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
        if (this._new_char != this.getCurrentChar()) {
          this.setCurrentChar(this._new_char);
          this._char_changed = true;
        }
        this._current_opacity = polyInOutEase(percent, 16);
      } else if (diff < 2 * ANIMATION_DURATION) {
        this._current_rotation =
          (absInOutEase(percent, 4, 10) * Math.PI * 2) / TAPE_LEN;
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

    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";

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
      if (this._char_changed && this._getCurrentPos() == i) {
        ctx.fillStyle = `rgb(0, 0, 0, ${this._current_opacity})`;
      } else {
        ctx.fillStyle = "black";
      }
      ctx.save();
      // draw divisions
      ctx.rotate(-spacing * i);
      ctx.beginPath();
      ctx.moveTo(0, this._inner_r);
      ctx.lineTo(0, this._r);
      ctx.stroke();

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
