'use strict';

const in_ctxt = in_canvas.getContext("2d");
const kernel_ctxt = kernel_canvas.getContext("2d");
const kernel_size = 15;

function initialise_canvases() {
    /////////////////
    // Main Canvases

    for (const canvas of [in_canvas, out_canvas]) {
        const width = 200;
        canvas.width = width;
        canvas.height = width;
    }

    const width = in_canvas.width;
    const height = in_canvas.height;
    for (let x = 0; x < width; x += 20) {
        for (let y = 0; y < height; y += 20) {
            in_ctxt.fillStyle = (x + y) % 40 === 0 ? "black" : "white";
            in_ctxt.fillRect(x, y, width / 2, height / 2);
        }
    }

    ///////////////////
    // Kernel

    kernel_canvas.width = kernel_size;
    kernel_canvas.height = kernel_size;

    kernel_ctxt.fillStyle = "hsl(0,0%,50%)";
    kernel_ctxt.fillRect(0, 0, kernel_size, kernel_size);
    kernel_ctxt.fillStyle = "hsl(0,0%,100%)";
    kernel_ctxt.fillRect(0, 7, 15, 1);
    // kernel_ctxt.fillRect(7, 7, 1, 1);
}

initialise_canvases();


const gl = new MyWebGL(out_canvas, `
precision highp float;
uniform vec2 resolution;

uniform sampler2D kernel;
uniform sampler2D image;

float get_kernel(ivec2 pos) {
    float value = texture2D(kernel, vec2(pos) / vec2(14.0)).x;
    return (value - 0.5) * 2.0;
}

float get_image(ivec2 pos) {
    return texture2D(image, vec2(pos) / (resolution - vec2(1.0))).x;
}

void main() {
    ivec2 pos = ivec2(gl_FragCoord);
    
    float intensity = 0.0;
    float weight = 0.0;
    
    for (int x = 0; x < 15; x++) {
        for (int y = 0; y < 15; y++) {
            ivec2 kpos = ivec2(x,y);
            // value of kernel at this point
            float kvalue = get_kernel(kpos);
            weight += kvalue;
            intensity += kvalue * get_image(pos + kpos - ivec2(7,7));
        }    
    }
    
    if (weight > 1.0) {
        intensity /= weight;
    }
  
    gl_FragColor = vec4(vec3(intensity), 1.0);
}
`);

const resolution = gl.property("resolution", "float", 2);
const image = gl.property("image", "image")
const kernel = gl.property("kernel", "image")

resolution[0] = out_canvas.width;
resolution[1] = out_canvas.height;
image[0] = MyGLTexture.with_source(gl, in_canvas);
kernel[0] = MyGLTexture.with_source(gl, kernel_canvas);
gl.render();

document.addEventListener("canvas_draw", () => {
    image[0].write(in_canvas);
    kernel[0].write(kernel_canvas);
    gl.render();
})