'use strict';

class MyWebGL {
    static #default_source = "void main() {}";
    static #vertex_shader = `
        attribute vec4 aVertexPosition;
        void main() {
            gl_Position = aVertexPosition;
        }
    `;
    #program = null;
    #vertex_position = null;
    #position_buffer = null;
    #source = null;
    #properties = [];

    constructor(canvas, source = MyWebGL.#default_source) {
        this.canvas = canvas;
        this.last_error = "";

        this.gl = this.create_gl();

        this.#position_buffer = this.position_buffer();

        this.source = source;
        this.canvas.addEventListener('resize', this.render, true);
    }

    set source(new_source) {
        this.#source = new_source;

        // Initialize a shader program; this is where all the lighting
        // for the vertices and so forth is established.
        this.#program = this.link_shaders(MyWebGL.#vertex_shader, new_source);
        this.#vertex_position = this.gl.getAttribLocation(this.#program, "aVertexPosition");
        this.#properties.forEach(p => p.make_handle());

        this.render();
    }

    error(msg) {
        this.last_error = msg;
        throw Error(msg);
    }

    property(name, type, length) {
        const obj = {
            my_webgl: this,
            type: type,
            length: length,
            data: [0, 0].slice(0, length), // array with correct length
            handle: null,
            make_handle() {
                this.handle = this.my_webgl.gl.getUniformLocation(this.my_webgl.#program, name)
            }
        };
        obj.make_handle();

        this.#properties.push(obj);
        return obj.data;
    }

    create_gl() {
        const gl = this.canvas.getContext("webgl")

        if (gl === null) {
            this.error("Unable to initialize WebGL. Your browser or machine may not support it.");
        }
        // Set clear color to black, fully opaque
        gl.clearColor(
            0.0,
            0.0,
            0.0,
            1.0
        );
        // Clear the color buffer with specified clear color
        gl.clear(gl.COLOR_BUFFER_BIT);

        return gl;
    }

    //
    // creates a shader of the given type, uploads the source and
    // compiles it.
    //
    load_shader(type, source) {
        const shader = this.gl.createShader(type);

        // Send the source to the shader object
        this.gl.shaderSource(shader, source);

        // Compile the shader program
        this.gl.compileShader(shader);

        // See if it compiled successfully
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            this.error(`An error occurred compiling the shaders: ${this.gl.getShaderInfoLog(shader)}`);
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    //
    // Initialize a shader program, so WebGL knows how to draw our data
    //
    link_shaders(vertex_source, fragment_source) {
        const vertex_shader = this.load_shader(this.gl.VERTEX_SHADER, vertex_source);
        const fragment_shader = this.load_shader(this.gl.FRAGMENT_SHADER, fragment_source);

        // Create the shader program
        const shader = this.gl.createProgram();
        this.gl.attachShader(shader, vertex_shader);
        this.gl.attachShader(shader, fragment_shader);
        this.gl.linkProgram(shader);

        // If creating the shader program failed, alert
        if (!this.gl.getProgramParameter(shader, this.gl.LINK_STATUS)) {
            this.error(`Unable to initialize the shader program: ${this.gl.getProgramInfoLog(shader)}`);
        }

        return shader;
    }

    to_blob(callback) {
        this.canvas.toBlob(callback);
    }

    download(name) {
        this.to_blob(blob => {
            const link = document.createElement("a");
            link.download = name;
            link.href = URL.createObjectURL(blob);
            link.click();
        });
    }

    position_buffer() {
        // Create a buffer for the square's positions.
        const position = this.gl.createBuffer();

        // Select the positionBuffer as the one to apply buffer
        // operations to from here out.
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, position);

        // Now create an array of positions for the square.
        const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

        return position;
    }

    render(width = null, height = null) {
        if (document.hidden) return
        if (width === null) width = this.canvas.width;
        if (height === null) height = this.canvas.height;

        const gl = this.gl;

        gl.useProgram(this.#program);
        gl.viewport(0, 0, width, height)


        for (const p of this.#properties) {
            switch (p.type) {
                case "int":
                    switch (p.length) {
                        case 1:
                            gl.uniform1i(p.handle, p.data[0]);
                            break;
                        case 2:
                            gl.uniform2i(p.handle, p.data[0], p.data[1]);
                            break;
                        default:
                            this.error(`Internal error: Unknown field length ${p.length}`);
                    }
                    break;
                case "float":
                    switch (p.length) {
                        case 1:
                            gl.uniform1f(p.handle, p.data[0]);
                            break;
                        case 2:
                            gl.uniform2f(p.handle, p.data[0], p.data[1]);
                            break;
                        default:
                            this.error(`Internal error: Unknown field length ${p.length}`);
                    }
                    break;
                default:
                    this.error(`Internal error: Unknown field type ${p.type}`);
            }
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
        gl.clearDepth(1.0); // Clear everything
        gl.enable(gl.DEPTH_TEST); // Enable depth testing
        gl.depthFunc(gl.LEQUAL); // Near things obscure far things

        // Clear the canvas before we start drawing on it.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        this.set_position_attribute();

        // Tell WebGL to use our program when drawing
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }

    set_position_attribute() {
        const numComponents = 2; // pull out 2 values per iteration
        const type = this.gl.FLOAT; // the data in the buffer is 32bit floats
        const normalize = false; // don't normalize
        const stride = 0; // how many bytes to get from one set of values to the next
        // 0 = use type and numComponents above
        const offset = 0; // how many bytes inside the buffer to start from
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.#position_buffer);
        this.gl.vertexAttribPointer(this.#vertex_position, numComponents, type, normalize, stride, offset);
        this.gl.enableVertexAttribArray(this.#vertex_position);
    }
}
