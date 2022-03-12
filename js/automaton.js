const TAPE_LEN = 25;
const DISKS_NUM = 3;
const ROTATION_LEN = 30;

const poly_ease_inout = (x, n = 10) => {
  if (x < 0.5) return Math.pow(2, n - 1) * Math.pow(x, n);
  return 1 - Math.pow(-2 * x + 2, n) / 2;
};

class Automaton {
  constructor(size) {
    this._size = size;
    this._current_frame = 0;

    const disk_width = this._size / DISKS_NUM / 2;
    const disk_spacing = disk_width / 2;

    this._disks = Array(DISKS_NUM)
      .fill(null)
      .map((_, i) => {
        const disk_r = this._size - (disk_spacing + disk_width) * i;
        return new Disk(disk_r, disk_width);
      });

    this._heads = Array(DISKS_NUM)
      .fill(null)
      .map((_, i) => new Head(this._disks[i]._r, disk_width / 4));
  }

  stepDisk() {
    this._disks.forEach((d) => {
      if (!d.is_stepping) {
        const dir = Math.random() < 0.33 ? 0 : Math.random() > 0.5 ? -1 : 1;
        d.step(dir);
      }
    });
  }

  update(current_frame) {
    this._current_frame = current_frame;
    this._disks.forEach((d) => d.update(current_frame));
  }

  show(ctx) {
    ctx.save();
    this._disks.forEach((d) => d.show(ctx));
    this._heads.forEach((h) => h.show(ctx));
    ctx.restore();
  }
}

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

class Disk {
  constructor(r, width) {
    this._r = Math.floor(r);
    this._inner_r = Math.floor(r - width);

    this._tape = Array(TAPE_LEN)
      .fill(null)
      .map((_, i) => i);

    this._current_frame = 0;
    this._base_rotation = 0;
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
      const percent = (current_frame - this._step_started) / ROTATION_LEN;

      // check if animation has ended
      if (percent < 1) {
        this._current_rotation =
          (poly_ease_inout(percent) * Math.PI * 2 * this._step_direction) /
          TAPE_LEN;
      } else {
        // it has, add the current rotation to the base angle and keep on going
        this._is_stepping = false;
        this._base_rotation += (Math.PI * 2 * this._step_direction) / TAPE_LEN;
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

    ctx.fillStyle = "black";
    ctx.font = `${font_size}px Courier New`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    ctx.save();
    ctx.rotate(this._base_rotation + this._current_rotation - spacing / 2);
    this._tape.forEach((t, i) => {
      ctx.save();
      // draw divisions
      ctx.rotate(spacing * i);
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
}
