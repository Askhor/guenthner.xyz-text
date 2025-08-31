const debugOutput = document.querySelector("#debug-output")
const download_button = document.getElementById("download-button")

download_button.onclick = download_graphic

function download_graphic() {
    onWindowResize(true)
    canvas.toBlob((image)=>{
        const link = document.createElement("a")
        link.download = "Mandelbrot"
        link.href = URL.createObjectURL(image)
        link.click()
    })
}

function error(message) {
    if (debugOutput.style.display !== "block") {
        debugOutput.style.display = "block"
        debugOutput.value = "Debug Output:\n"
    }
    debugOutput.value += message + "\n";
    debugOutput.style.height = debugOutput.scrollHeight + "px";
}

const vsSource = `
    attribute vec4 aVertexPosition;
    void main() {
      gl_Position = aVertexPosition;
    }
`;

const max_iter_count = 50
const fsSource = `
    precision highp float;
    uniform ivec2 resolution;
    uniform vec2 cam_offset;
    uniform float cam_scale;
    uniform int iter_count;
    uniform vec2 color_split;
    uniform vec2 start_position;
    const int max_iter_count = ${max_iter_count};
    
    vec2 complex_square(vec2 z) {
        return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
    }
    
    float complex_absolute(vec2 z) {
        return sqrt(z.x * z.x + z.y * z.y);
    }
    
    int divergence(vec2 z, vec2 c) {
        for (int i = 0; i < max_iter_count; i++) {
            if (i >= iter_count) return i;
            
            z = complex_square(z);
            z += c;
                        
            if (complex_absolute(z) > 2.0) return i;
        }
        return iter_count;
    }

    float calc_intensity(vec2 z) {
        int div = divergence(start_position, z);
        return float(iter_count - div) / float(iter_count);
    }

    void main() {
      ivec2 screen_pos = ivec2(gl_FragCoord) - resolution / 2;
      //vec2 z = 2.0 * vec2(screen_pos + cam_offset) / float(resolution.x) * cam_scale;
      vec2 real_pos = vec2(screen_pos) / float(resolution.x) * cam_scale;
      vec2 z = cam_offset + real_pos;
       
      gl_FragColor = vec4(
        calc_intensity(z - color_split),
        calc_intensity(z),
        calc_intensity(z + color_split),
        1.0);
    }
  `;


const canvas = document.querySelector("#gl-canvas");
const content_container = document.querySelector("#content-container")
// Initialize the GL context
const gl = canvas.getContext("webgl");
const iter_count = document.querySelector("#iter-count")
const pulsation = document.querySelector("#pulsation")
const split_amount = document.querySelector("#split-amount")
const split_direction = document.querySelector("#split-direction")
const zoom = document.querySelector("#zoom")
const start_position = {
    x: document.querySelector("#start-x"),
    y: document.querySelector("#start-y")
}
iter_count.min = 0
iter_count.max = 1
iter_count.step = "any"
iter_count.value = 0.4
pulsation.min = 0
pulsation.max = 10
pulsation.step = "any"
pulsation.value = 2
split_amount.min = 0
split_amount.max = 1
split_amount.step = "any"
split_amount.value = 0
split_direction.min = 0
split_direction.max = 2 * Math.PI
split_direction.step = "any"
split_direction.value = 1.5
zoom.min = 0
zoom.max = 2.6
zoom.step = "any"
zoom.value = zoom.max
for (const coord in start_position) {
    const slider = start_position[coord]
    slider.min = -1
    slider.max = 1
    slider.step = "any"
    slider.value = 0
}
// iter_count.oninput = onWindowResize;
// pulsation.oninput = onWindowResize;
let origin_position = {x: 0, y: 0}
let active_zoom_scale = 1

function actual_zoom() {
    return Math.pow(zoom.value, 2)
}

// Only continue if WebGL is available and working
if (gl === null) {
    error(
        "Unable to initialize WebGL. Your browser or machine may not support it."
    );
}

// Set clear color to black, fully opaque
gl.clearColor(0.0, 0.0, 0.0, 1.0);
// Clear the color buffer with specified clear color
gl.clear(gl.COLOR_BUFFER_BIT);


// Initialize a shader program; this is where all the lighting
// for the vertices and so forth is established.
const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

// Collect all the info needed to use the shader program.
// Look up which attribute our shader program is using
// for aVertexPosition and look up uniform locations.
const programInfo = {
    program: shaderProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
    },
    uniformLocations: {
        projectionMatrix: gl.getUniformLocation(
            shaderProgram,
            "uProjectionMatrix"
        ),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
    },
};

// Here's where we call the routine that builds all the
// objects we'll be drawing.
const buffers = initBuffers(gl);

const uniform_resolution = gl.getUniformLocation(shaderProgram, "resolution")
const uniform_cam_offset = gl.getUniformLocation(shaderProgram, "cam_offset");
const uniform_cam_scale = gl.getUniformLocation(shaderProgram, "cam_scale");
const uniform_iter_count = gl.getUniformLocation(shaderProgram, "iter_count");
const uniform_color_split = gl.getUniformLocation(shaderProgram, "color_split");
const uniform_start_position = gl.getUniformLocation(shaderProgram, "start_position");

function makeElementDragControl(element) {
    function startMouseDrag(event) {
        event.preventDefault()
        let last_x = event.x
        let last_y = event.y

        let onMove = (mevent) => {
            mevent.preventDefault()
            origin_position.x -= (mevent.x - last_x) / canvas.width * actual_zoom()
            origin_position.y += (mevent.y - last_y) / canvas.width * actual_zoom()
            last_x = mevent.x
            last_y = mevent.y
        }

        let dragStop = (mevent) => {
            mevent.preventDefault()
            document.onpointermove = null
            document.onpointerup = null
        }

        document.onpointermove = onMove
        document.onpointerup = dragStop
    }

    element.onpointerdown = startMouseDrag
}

document.addEventListener("DOMContentLoaded", () => {
    makeElementDragControl(canvas)
    makeElementDragControl(content_container)
})

document.addEventListener("keydown", event => {
        if (event.key === " ") {
            active_zoom_scale = 0.8
            event.preventDefault()
        }
    }
)
document.addEventListener("keyup", event => {
        if (event.key === " ") {
            active_zoom_scale = 1
            event.preventDefault()
        }
    }
)

function draw() {
    drawScene(gl, programInfo, buffers)
}

// Tell WebGL how to pull out the positions from the position
// buffer into the vertexPosition attribute.
function setPositionAttribute(gl, buffers, programInfo) {
    const numComponents = 2; // pull out 2 values per iteration
    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

function drawScene(gl, programInfo, buffers) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    setPositionAttribute(gl, buffers, programInfo);

    // Tell WebGL to use our program when drawing

    {
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}


function initBuffers(gl) {
    const positionBuffer = initPositionBuffer(gl);

    return {
        position: positionBuffer,
    };
}

function initPositionBuffer(gl) {
    // Create a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the square.
    const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return positionBuffer;
}


//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        error(
            `Unable to initialize the shader program: ${gl.getProgramInfoLog(
                shaderProgram
            )}`
        );
        return null;
    }

    return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object

    gl.shaderSource(shader, source);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        error(
            `An error occurred compiling the shaders:
             ${gl.getShaderInfoLog(shader)}
             `
        );
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

let lastRedraw = Date.now()

function onWindowResize(high_res_render=false) {
    const time = Date.now()
    const delta = (time - lastRedraw) / 1000.0;
    lastRedraw = time;

    zoom.value *= Math.pow(active_zoom_scale, delta)

    let width = window.visualViewport.width;
    let height = window.visualViewport.height;
    if (high_res_render) {
        const scale = height / width;
        width = 4000;
        height =  scale * width;
    }
    canvas.width = width;
    canvas.height = height;

    if (document.hidden) return

    gl.useProgram(programInfo.program);
    gl.viewport(0, 0, width, height)

    gl.uniform2i(uniform_resolution, width, height)
    const pulsation_value = pulsation.value * (1 + Math.sin(2 * Math.PI * new Date().getMilliseconds() / 1000.0)) / 2
    gl.uniform1i(uniform_iter_count, Math.exp(7 * iter_count.value) + pulsation_value)
    gl.uniform2f(uniform_cam_offset, origin_position.x, origin_position.y)
    gl.uniform1f(uniform_cam_scale, actual_zoom())
    gl.uniform2f(
        uniform_color_split,
        Math.cos(split_direction.value) * Math.pow(split_amount.value, 10),
        Math.sin(split_direction.value) * Math.pow(split_amount.value, 10)
    )
    gl.uniform2f(uniform_start_position, start_position.x.value, start_position.y.value)

    draw()
}

onWindowResize()

setInterval(onWindowResize, 10)

window.addEventListener('resize', onWindowResize, true)