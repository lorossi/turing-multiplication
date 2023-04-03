const WHITE = "#F5F5F5";
const BLACK = "#0E0E0E";

// i could have used regex but I was feeling unsecure about it
const Alphabet = {
  ANY: "*",
  NON_NULL: ".",
  NUMERIC: "!",
  ALPHABET: ["0", "1", "#", " "],
};

/**
 * Asymmetric Polynomial in out easing (different exponents for in and out)
 *
 * @param {number} x value to ease in range [0, 1]
 * @param {number} ni exponent for in
 * @param {number} no exponent for out
 * @returns {number}
 */
const absInOutEase = (x, ni = 5, no = 5) => {
  if (x < 0.5) return Math.pow(2, ni - 1) * Math.pow(x, ni);
  return 1 - Math.pow(-2 * x + 2, no) / 2;
};

/**
 * Polynomial in easing
 *
 * @param {number} x value to ease in range [0, 1]
 * @param {number} n exponent
 * @returns {number}
 */
const polyInEase = (x, n = 5) => Math.pow(x, n);

/**
 * Decimal to hexadecimal conversion
 * @param {number} dec decimal number
 * @param {number} length length of the output string
 * @param {boolean} prefix add 0x prefix
 * @param {boolean} round round the decimal number
 * @returns {string}
 */
const dec_to_hex = (dec, length = 0, prefix = false, round = true) => {
  if (round) dec = Math.floor(dec);
  let hex = dec.toString(16).padStart(length, 0).toUpperCase();
  if (prefix) hex = "0x" + hex;
  return hex;
};

class TuringMachine {
  /**
   *
   * @param {number} size of the TM in pixels
   * @param {*} tapes_num number of tapes
   * @param {*} tapes_len length of each tape
   *
   * To be fair, this is not a Turing Machine, but a linear bounded Turing Machine.
   */
  constructor(size, tapes_num = 2, tapes_len = 25) {
    this._size = size;
    this._tapes_num = tapes_num;
    this._tapes_len = tapes_len;

    this._current_frame = 0;
    this._ended = false;
    this._error = false;

    const disk_width = (this._size / this._tapes_num) * 0.4;
    const disk_spacing = disk_width / 2;

    // instantiate all the K tapes
    this._tapes = Array(this._tapes_num)
      .fill(null)
      .map((_, i) => {
        const disk_r = this._size - (disk_spacing + disk_width) * i;
        return new CircularTape(disk_r, disk_width, this._tapes_len);
      })
      .reverse();

    // instantiate the heads
    this._heads = Array(this._tapes_num)
      .fill(null)
      .map(
        (_, i) => new Head(this._tapes[i]._r, disk_width / 5, this._tapes_len)
      );

    // instantiate the FSA controlling the TM
    this._fsa = new FSA(this._tapes[0].inner_r * 2 - disk_spacing * 2);
  }

  /**
   * Set the tapes content
   * @param {Array} contents: array of strings
   */
  setTapes(contents) {
    this._tapes.forEach((t, i) => t.setTape(contents[i].split("")));
  }

  /**
   *
   * @param {int} current_frame
   */
  update(current_frame, animation_duration) {
    if (this._error || this._ended) return;

    // save the current frame, needed for animations
    this._current_frame = current_frame;

    // update the FSA and each frame
    this._fsa.update(current_frame, animation_duration);
    if (this._fsa.error) {
      this._error = true;
    }
    this._tapes.forEach((t) => t.update(current_frame, animation_duration));

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

  /**
   * Show the TM
   *
   * @param {CanvasRenderingContext2D} ctx
   */
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
      if (Alphabet.ALPHABET.contains(c)) this._tapes[i].current_char = c;
    });
  }

  /**
   * @returns {boolean} true if the TM is in error state
   * @readonly
   */
  get error() {
    return this._error;
  }

  /**
   * @returns {boolean} true if the TM has ended
   * @readonly
   */
  get ended() {
    return this._ended;
  }
}

/**
 * Class handling a single state
 */
class State {
  /**
   *
   * @param {string} name of the state
   * @param {boolean} initial true if the state is initial
   * @param {boolean} final true if the state is final
   */
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

  /**
   * Converts a transition to a string, in tikz format.
   * I used this method to draw the transitions in the report without having to write them by hand.
   *
   * @returns {string}
   */
  toLaTeX() {
    const format_c = (c) => {
      switch (c) {
        case " ":
          return "\\varepsilon";
        case "0":
        case "1":
          return c;
        case "#":
          return "\\#";
        case "*":
          return "0 \\vert 1 \\vert \\# \\vert \\varepsilon";
        case ".":
          return "0 \\vert 1 \\vert \\#";
        case "!":
          return "0 \\vert 1";
      }
    };

    const format_dir = (d) => {
      return d
        .split("")
        .map((dd) => {
          switch (dd) {
            case "L":
              return "\\leftarrow";
            case "R":
              return "\\rightarrow";
            case "S":
              return "\\downarrow";
          }

          return dd;
        })
        .join("");
    };

    const add_brackets = (c) => `\\left( ${c} \\right)`;

    const insertAtIndex = (str, substring, index) => {
      while (index < 0) index = str.length + index;
      return str.slice(0, index) + substring + str.slice(index);
    };

    let latex = "";
    latex += `\\path[->] (${this.from_state}) edge `;

    if (this.from_state == this.to_state)
      latex += "[loop above, looseness=30] ";
    else latex += "[bend left] ";

    const text_position =
      this.from_state == this.to_state
        ? "above"
        : parseInt(this.from_state.slice(1)) > parseInt(this.to_state.slice(1))
        ? "below"
        : "above";

    latex += `node[${text_position}]{$`;

    let chars = this.chars
      .split("")
      .map((c) => format_c(c))
      .map((c) => add_brackets(c));
    chars = insertAtIndex(chars, "\\langle", 0);
    chars = insertAtIndex(chars, "\\rangle", chars.length);

    latex += chars;
    latex += " \\vert ";

    let new_chars = this.new_chars
      .split("")
      .map((c) => format_c(c))
      .map((c) => add_brackets(c));
    new_chars = insertAtIndex(new_chars, "\\langle", 0);
    new_chars = insertAtIndex(new_chars, "\\rangle", new_chars.length);

    latex += new_chars;

    latex += ", ";
    latex += add_brackets(format_dir(this.directions));
    latex += `$} (${this.to_state});`;

    return latex;
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

    // Initialize all the states
    this._states = [
      new State("q0", true, false), // initial state, look for end in input tape
      new State("q1", false, false), // end found in input tape
      new State("q2", false, false), // 1 found
      new State("q3", false, false), // add input tape into output tape
      new State("q4", false, false), // carry
      new State("q5", false, false), // rewind output and memory tape
      new State("q6", false, false), // rewind output tape until end
      new State("q7", false, false), // clean input tape
      new State("qf", false, true), // everything dome
    ];
    // Initialize all the transitions

    // Any character: *
    // Non null character: .
    // Numeric character: !

    this._transitions = [
      new Transition("q0", "q0", ".*", "**", "RS"), // move right to find end
      new Transition("q0", "q1", " *", " *", "LL"), // end found

      new Transition("q1", "q1", "0 ", " 0", "LL"), // 0 found, write zero to output and go left
      new Transition("q1", "q1", "0!", " *", "LL"),
      new Transition("q1", "q2", "1*", " *", "LS"), // 1 found, go left and start adding
      new Transition("q1", "q6", " !", " !", "SL"), // multiplication ended, rewind output tape
      new Transition("q1", "q6", "#*", "#*", "SL"), // separator found without numbers, go to end

      new Transition("q2", "q2", "!*", "!*", "LS"), // go left looking for separator
      new Transition("q2", "q3", "#*", "#*", "LS"), // delimiter found, start adding

      new Transition("q3", "q3", "00", "00", "LL"), // add 1 without carry
      new Transition("q3", "q3", "0 ", "00", "LL"),
      new Transition("q3", "q3", "10", "11", "LL"),
      new Transition("q3", "q3", "1 ", "11", "LL"),
      new Transition("q3", "q3", "01", "01", "LL"),

      new Transition("q3", "q4", "11", "*0", "LL"), // add 1 with carry

      new Transition("q3", "q5", " *", " *", "RR"), // start rewinding memory and output tapes
      new Transition("q1", "q6", "  ", "  ", "SL"), // align output

      new Transition("q4", "q3", "  ", " 1", "LL"), // carry and go back
      new Transition("q4", "q3", "0 ", "01", "LL"),
      new Transition("q4", "q3", " 0", " 1", "LL"),
      new Transition("q4", "q3", "00", "01", "LL"),

      new Transition("q4", "q4", "1 ", "10", "LL"), // keep carrying
      new Transition("q4", "q4", "01", "00", "LL"),
      new Transition("q4", "q4", "10", "10", "LL"),
      new Transition("q4", "q4", "11", "11", "LL"),

      new Transition("q5", "q5", "!*", "**", "RR"), // rewinding tapes
      new Transition("q5", "q5", " *", " *", "RR"), // rewinding tapes
      new Transition("q5", "q0", "#*", "#*", "RL"), // found the separator, start looking for end again

      new Transition("q6", "q6", "*!", "**", "SL"), // start rewinding
      new Transition("q6", "q7", "* ", "**", "SR"), // space found in output tape, go back one step

      new Transition("q7", "q7", ".*", " *", "LS"), // clear input tape
      new Transition("q7", "qf", " *", " *", "SS"), // input tape clear, ending
    ];

    if (this._states.length == 0) {
      this._error = true;
      this._current_opacity = null;
    } else {
      // select the initial state
      this._current_state = this._states.filter((s) => s.initial)[0];
    }
  }

  _compareStrings(s1, s2) {
    if (s1.length != s2.length) return false;

    for (let i = 0; i < s1.length; i++) {
      if (s1.charAt(i) == Alphabet.ANY || s2.charAt(i) == Alphabet.ANY)
        continue;

      if (s1.charAt(i) == Alphabet.NON_NULL && s2.charAt(i) != " ") continue;
      if (s2.charAt(i) == Alphabet.NON_NULL && s1.charAt(i) != " ") continue;

      if (s1.charAt(i) == Alphabet.NUMERIC && ["0", "1"].includes(s2.charAt(i)))
        continue;
      if (s2.charAt(i) == Alphabet.NUMERIC && ["0", "1"].includes(s1.charAt(i)))
        continue;

      if (s1.charAt(i) != s2.charAt(i)) return false;
    }

    return true;
  }

  _findTransition(chars) {
    const transitions = this._transitions
      .filter((t) => t.from_state == this._current_state.name)
      .filter((t) => this._compareStrings(chars, t.chars));

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

      if (this._current_state.final) {
        console.log("Ended");
        return;
      }

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

    // set the animation to true
    this._is_animating = true;
    this._animation_started = this._current_frame;
    this._current_opacity = 0;

    return {
      new_chars: next_transition.new_chars,
      directions: next_transition.directions,
    };
  }

  update(current_frame, animation_duration) {
    this._current_frame = current_frame;

    if (!this._is_animating) return;

    // calculate elapsed time from animation start
    const elapsed = current_frame - this._animation_started;
    // end animation if enough time has been elapsed
    if (elapsed > animation_duration) {
      this._is_animating = false;
      return;
    }

    // calculate current state opacity
    const percent = elapsed / animation_duration;
    this._current_opacity = polyInEase(percent, 4) * 255;
  }

  show(ctx) {
    const theta = (Math.PI * 2) / this._states.length;
    // there's a lower bound on the state size
    const state_size = (Math.PI * this._size) / this._states.length / 4;

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
  constructor(dist, size, tape_len) {
    this._dist = dist;
    this._size = size;
    this._span = (Math.PI * 2) / tape_len / 4;
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
  constructor(r, width, tapes_len) {
    this._r = Math.floor(r);
    this._inner_r = Math.floor(r - width);
    this._tapes_len = tapes_len;

    // fill the tape with blank characters
    this._tape = Array(this._tapes_len)
      .fill(null)
      .map((_) => Alphabet.ALPHABET[Alphabet.ALPHABET.length - 1]);
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
    this._tape = [...tape].filter((t) => Alphabet.ALPHABET.includes(t));

    for (let i = this._tape.length; i < this._tapes_len; i++)
      this._tape.push(Alphabet.ALPHABET[Alphabet.ALPHABET.length - 1]);
  }

  setAnimation(new_char, step_direction) {
    // set the animation with the new char and the step direction
    this._is_animating = true;
    this._animation_started = this._current_frame;

    if (Alphabet.ALPHABET.includes(new_char)) {
      this._new_char = new_char;
    } else {
      this._new_char = this.getCurrentChar();
    }

    this._step_direction = this._directions_map[step_direction];
  }

  update(current_frame, animation_duration) {
    this._current_frame = current_frame;

    if (this._is_animating) {
      const diff = this._current_frame - this._animation_started;
      const percent = (diff / animation_duration) % 1;

      if (diff < animation_duration) {
        // animate the char
        if (this._new_char != this.getCurrentChar()) {
          this.setCurrentChar(this._new_char);
          this._char_changed = true;
        }
        this._current_opacity = polyInEase(percent) * 255;
      } else if (diff < 2 * animation_duration) {
        // animate the rotation
        this._current_rotation =
          ((absInOutEase(percent, 4, 10) * Math.PI * 2) / this._tapes_len) *
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
    const spacing = (Math.PI * 2) / this._tapes_len;

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

    while (pos < 0) pos += this._tapes_len;
    while (pos >= this._tapes_len) pos -= this._tapes_len;

    return pos;
  }

  getCurrentChar() {
    const pos = this._getCurrentPos();
    return this._tape[pos];
  }

  setCurrentChar(char) {
    if (!Alphabet.ALPHABET.includes(char) || char == Alphabet.ANY) {
      this._new_char = this.getCurrentChar();
      return;
    }

    const pos = this._getCurrentPos();
    this._tape[pos] = char;
  }

  get is_animating() {
    return this._is_animating;
  }

  get inner_r() {
    return this._inner_r;
  }
}
