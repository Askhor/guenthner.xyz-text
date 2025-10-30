'use strict';

class CanvasManager {
    #canvas = null;
    #ctxt = null;
    #last_pos = [0, 0];
    #drawing = false;

    constructor(canvas) {
        this.#canvas = canvas;
        this.#ctxt = canvas.getContext("2d");

        canvas.addEventListener("mousedown", e => {
            if ((e.buttons & 1) === 0) return;
            this.#drawing = true;
            this.#last_pos = this.mouse_pos(e);
        });
        canvas.addEventListener("mousemove", e => {
            if (this.#drawing) {
                const new_pos = this.mouse_pos(e);
                this.draw_line(this.#last_pos, new_pos);
                this.#last_pos = new_pos;
            }
        });
        document.addEventListener("mouseup", e => {
            if (this.#drawing) {
                if (e.target === this.#canvas)
                    this.draw_line(this.#last_pos, this.mouse_pos(e));
                this.#drawing = false;
            }
        });
    }

    mouse_pos(evt) {
        const [x, y] = [evt.offsetX, evt.offsetY];
        const canvas = this.#canvas;
        return [x * canvas.width / canvas.clientWidth, y * canvas.height / canvas.clientHeight];
    }

    draw_line(a, b) {
        const c = this.#ctxt;
        const brush = Alpine.store("brush");
        const value = brush.value * 255;

        c.strokeStyle = `rgb(${value}, ${value}, ${value})`;
        c.lineWidth = brush.radius;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(...a);
        c.lineTo(...b);
        c.stroke();
        c.closePath();

        document.dispatchEvent(new CustomEvent("canvas_draw"))
    }
}


document.querySelectorAll("canvas.drawable").forEach((el) => new CanvasManager(el));
document.querySelectorAll(".color-view").forEach(el => {
    Alpine.effect(() => {
        const brush = Alpine.store("brush");
        const style = el.style;
        const size = `${brush.radius + 10}px`;
        const value = brush.value * 255;

        style.borderRadius = size;
        style.borderWidth = size;
        style.borderColor = `rgb(${value}, ${value}, ${value})`;
    });
})