'use strict';

class MyGLTexture {

    mygl;
    #texture_id;
    #texture;

    constructor(gl) {
        this.mygl = gl;
        this.#texture_id = this.mygl.allocate_texture_unit();

        this.#init_texture();
    }

    #init_texture() {
        const gl = this.mygl.gl;
        const defaults = this.#texture_defaults();

        gl.activeTexture(this.#gl_handle());
        this.#texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.#texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            defaults.level,
            defaults.internalFormat,
            1, 1,
            defaults.border,
            defaults.srcFormat,
            defaults.srcType,
            new Uint8Array([200, 200, 255, 255]),
        );
    }

    #gl_handle() {
        return this.mygl.gl.TEXTURE0 + this.#texture_id;
    }

    id() {
        return this.#texture_id
    }

    static with_source(gl, source) {
        const texture = new MyGLTexture(gl);
        texture.write(source);
        return texture;
    }

    write(source) {
        const defaults = this.#texture_defaults();
        const gl = this.mygl.gl;

        gl.activeTexture(this.#gl_handle());
        // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.bindTexture(gl.TEXTURE_2D, this.#texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            defaults.level,
            defaults.internalFormat,
            defaults.srcFormat,
            defaults.srcType,
            source,
        );

        // WebGL1 has different requirements for power of 2 images
        // vs. non power of 2 images so check if the image is a
        // power of 2 in both dimensions.
        if (this.isPowerOf2(source.width) && this.isPowerOf2(source.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // No, it's not a power of 2. Turn off mips and set
            // wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    }

    isPowerOf2(value) {
        return (value & (value - 1)) === 0;
    }

    #texture_defaults() {
        const gl = this.mygl.gl;
        return {
            level: 0,
            border: 0,
            internalFormat: gl.RGBA,
            srcFormat: gl.RGBA,
            srcType: gl.UNSIGNED_BYTE
        }
    }
}

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
    #texture_count = 0;
    last_error = ""

    constructor(canvas, source = MyWebGL.#default_source) {
        this.canvas = canvas;

        this.gl = this.create_gl();

        this.#position_buffer = this.position_buffer();

        this.source = source;
        this.canvas.addEventListener('resize', this.render, true);
    }

    set source(new_source) {
        this.#texture_count = 0;
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
        console.error(msg);
        throw Error(msg);
    }

    allocate_texture_unit() {
        return this.#texture_count++;
    }


    property(name, type, length = 1) {
        const obj = {
            my_webgl: this,
            type: type,
            length: length,
            data: [0, 0].slice(0, length), // array with correct length
            handle: null,
            make_handle() {
                const location = this.my_webgl.gl.getUniformLocation(this.my_webgl.#program, name)
                if (location === null) {
                    console.log(`The gl variable ${name} does not exist or is unused`);
                }
                this.handle = location;
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

    #update_property_float(p) {
        const gl = this.gl;
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
    }

    #update_property_int(p) {
        const gl = this.gl;
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
    }

    #update_property_image(p) {
        if (p.data[0] === 0) return;

        const gl = this.gl;
        const location = p.handle;
        const texture = p.data[0];

        gl.uniform1i(location, texture.id());
    }


    render(width = null, height = null) {
        if (document.hidden) return
        if (width === null) width = this.canvas.width;
        if (height === null) height = this.canvas.height;

        const gl = this.gl;

        gl.useProgram(this.#program);
        gl.viewport(0, 0, width, height);


        for (const p of this.#properties) {
            switch (p.type) {
                case "int":
                    this.#update_property_int(p);
                    break;
                case "float":
                    this.#update_property_float(p);
                    break;
                case "image":
                    this.#update_property_image(p);
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
