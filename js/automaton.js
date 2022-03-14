const TAPE_LEN = 25;
const DISKS_NUM = 3;
const ROTATION_DURATION = 30;
const ALPHABET = [0, 1, "b"];

const inOutEase = (x, n = 10) => {
  if (x < 0.5) return Math.pow(2, n - 1) * Math.pow(x, n);
  return 1 - Math.pow(-2 * x + 2, n) / 2;
};

const absInOutEase = (x, ni = 5, no = 5) => {
  if (x < 0.5) return Math.pow(2, ni - 1) * Math.pow(x, ni);
  return 1 - Math.pow(-2 * x + 2, no) / 2;
};

class Automaton {
  constructor(size) {
    this._size = size;
    this._current_frame = 0;

    const disk_width = this._size / DISKS_NUM / 2;
    const disk_spacing = disk_width / 2;

    this._tapes = Array(DISKS_NUM)
      .fill(null)
      .map((_, i) => {
        const disk_r = this._size - (disk_spacing + disk_width) * i;
        return new CircularTape(disk_r, disk_width);
      });

    this._heads = Array(DISKS_NUM)
      .fill(null)
      .map((_, i) => new Head(this._tapes[i]._r, disk_width / 5));
  }

  stepDisks(dir = 0) {
    this._tapes.forEach((d) => {
      if (!d.is_stepping) {
        let tape_dir;

        if (dir == 0) {
          tape_dir = Math.random() > 0.33 ? (Math.random() > 0.5 ? -1 : 1) : 0;
        } else {
          tape_dir = dir;
        }

        d.step(tape_dir);
      }
    });
  }

  getCurrentChars() {}

  update(current_frame) {
    this._current_frame = current_frame;
    this._tapes.forEach((d) => d.update(current_frame));
  }

  show(ctx) {
    ctx.save();
    this._tapes.forEach((d) => d.show(ctx));
    this._heads.forEach((h) => h.show(ctx));
    ctx.restore();
  }

  get current_chars() {
    return this._tapes.reduce((a, b) => b.current_value.toString() + a, "");
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
      .map((_) => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);

    this._current_frame = 0;
    this._current_position = 0;
    this._current_rotation = 0;
    this._is_stepping = false;
    this._step_started = 0;
    this._step_direction = 0;
  }

  step(direction) {
    // check if the disk is already stepping
    if (this._is_stepping) return;

    // sets the step animation
    this._is_stepping = true;
    this._step_started = this._current_frame;
    this._step_direction = direction;
  }

  update(current_frame) {
    this._current_frame = current_frame;
    if (this._is_stepping) {
      // compute rotation if step animation is occurring
      const percent = (current_frame - this._step_started) / ROTATION_DURATION;

      // check if animation has ended
      if (percent < 1) {
        this._current_rotation =
          (absInOutEase(percent, 4, 10) * Math.PI * 2 * this._step_direction) /
          TAPE_LEN;
      } else {
        // it has, add the current rotation to the base angle and keep on going
        this._is_stepping = false;
        this._current_rotation = 0;
        this._current_position += this._step_direction;
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

    ctx.fillStyle = "black";
    ctx.font = `${font_size}px Courier New`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const current_rotation = spacing * this._current_position;

    ctx.save();
    ctx.rotate(this._current_rotation - spacing / 2 + current_rotation);
    this._tape.forEach((t, i) => {
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

  get is_stepping() {
    return this._is_stepping;
  }

  get current_value() {
    let pos = this._current_position;

    while (pos < 0) pos += TAPE_LEN;
    while (pos >= TAPE_LEN) pos -= TAPE_LEN;

    return this._tape[pos];
  }
}
