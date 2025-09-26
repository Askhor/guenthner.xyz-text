const cell_size = 20;
let eratosthenes_initialised = false;
let table_root = null;
let table_width_input = null;
let table_height_input = null;
let create_table_button = null;
let constellation_settings_container = null;
let constellation_settings = null;
let number_info_element = null;
const checked_numbers = new Set(); // checked w lmb
const rchecked_numbers = new Set(); // checked w rmb
let current_render_id = 0;
let current_mouse_x = 0; // These values are for cells
let current_mouse_y = 0;

function random_next_state(state) {
    const modulo = (1 << 23)
    const multiply = 65793
    const add = 4282663

    return multiply * state + add & (modulo - 1)
}

function random_float(seed, index) {
    const modulo = (1 << 23)

    for (let i = 0; i < index; i++) {
        seed = random_next_state(seed)
    }

    return seed / modulo
}

function color_for_number(index) {
    const builtin_color_count = 10

    if (index < builtin_color_count) {
        return ["pink", "darkred", "darkblue", "orange", "cyan", "green", "purple", "teal", "yellow", "brown"][index % builtin_color_count]
        // return `var(--table-color${index % builtin_color_count})`
    }

    // return `hsl(${index * 53.234234}deg, 100%, ${50 + 10 * Math.sin(index / 3)}%)`
    return `hsl(${random_float(0, index) * 360}deg, 100%, ${30 + 40 * random_float(1000, index)}%)`
}

function handle_user_error(message) {
    console.log(`Error: ${message}`)
}

function clamp(num, min, max) {
    return Math.min(max, Math.max(min, num))
}

function get_constellation() {
    const enabled_settings = []
    for (let i = 0; i < constellation_settings.length; i++) {
        if (constellation_settings[i].enabled.checked) {
            enabled_settings.push(constellation_settings[i])
        }
    }
    const degree = enabled_settings.length
    const multiplies = new Array(degree)
    const adds = new Array(degree)

    for (let i = 0; i < degree; i++) {
        multiplies[i] = parseInt(enabled_settings[i].multiply.value, 10)
        adds[i] = parseInt(enabled_settings[i].add.value, 10)
    }

    return int => {
        const list = new Array(degree)
        for (let i = 0; i < degree; i++) {
            list[i] = multiplies[i] * int + adds[i]
        }
        return list
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function render(render_id) {
    const checked_numbers_lst = new Array(checked_numbers.size)
    let index = 0
    checked_numbers.forEach(item => {
        checked_numbers_lst[index++] = item
    })
    checked_numbers_lst.sort((a, b) => a === b ? 0 : (a > b ? 1 : -1))
    console.log(`Rendering with checked numbers: ${checked_numbers_lst}`)

    const ctxt = table_root.getContext("2d")
    // ctxt.clearRect(0, 0, table_root.width, table_root.height)

    const width = table_root.width / cell_size
    const height = table_root.height / cell_size

    const colors = new Array(width * height) // the colors to be rendered
    const null_color = "white" // default is white
    colors.fill(null_color)
    colors[0] = "darkgrey" // 0 and 1 are both colored grey
    colors[1] = "darkgrey"

    const constellation = get_constellation()

    // force means overwrite any color, otherwise only write if empty
    function try_mark(number, color, force) {
        const values = constellation(number) // the values the constellation specifies for this number
        for (const index in values) {
            if (force || colors[values[index]] === null_color) {
                colors[values[index]] = color
            }
        }
    }


    for (let i = 0; i < checked_numbers_lst.length; i++) {
        const _prime_ = checked_numbers_lst[i] // the number the user 'considers' to be 'prime'

        for (let int = 2 * _prime_; int < colors.length; int += _prime_) {
            if (rchecked_numbers.has(_prime_)) {
                try_mark(int, "#bbb", true); // multiples of rmb checked numbers are grey (distinguish from others)
            } else {
                try_mark(int, color_for_number(i), false); // otherwise multiples get marked
            }
        }
    }

    ctxt.strokeStyle = "black"
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (render_id !== current_render_id) return
            const int = x + y * width

            if (rchecked_numbers.has(int)) {
                ctxt.fillStyle = (int % 2 === 0) ? "#777" : "#000"; // rmb checked numbers are grey/black depending on parity
            } else {
                ctxt.fillStyle = colors[int];
            }
            ctxt.fillRect(x * cell_size, y * cell_size, cell_size, cell_size)
            ctxt.strokeRect(x * cell_size, y * cell_size, cell_size, cell_size)

            if (int > 300 && int % 20 === 0) {
                await sleep(1)
            }
        }
    }
    checked_numbers_lst.push(rchecked_numbers);

    ctxt.textBaseline = "bottom"
    ctxt.textAlign = "center"
    ctxt.font = `${cell_size}px serif`
    for (let i = 0; i < checked_numbers_lst.length; i++) {
        const _prime_ = checked_numbers_lst[i]; // the number the user 'considers' the number 'prime'
        const start_x = (_prime_ % width) * cell_size;
        const start_y = Math.floor(_prime_ / width) * cell_size;
        const half_size = cell_size / 2;

        if (rchecked_numbers.has(_prime_)) {
            ctxt.fillStyle = "white"; // white text on black bg
        } else {
            ctxt.fillStyle = "black"; // black text on white bg
        }
        ctxt.fillText(_prime_.toString(), start_x + half_size, start_y + cell_size)
    }
}

function rerender() {
    setTimeout(() => render(++current_render_id), 0)
}

function set_toggle(set, element) {
    if (set.has(element)) {
        set.delete(element);
    } else {
        set.add(element);
    }
}

function screen_to_cell_x(canvas, x) {
    // Processing x
    x = clamp(x, 0, canvas.width);
    x /= cell_size;
    x = Math.floor(x);
    return x;
}

function screen_to_cell_y(canvas, y) {
    // Processing y
    y = clamp(y, 0, canvas.height);
    y /= cell_size;
    y = Math.floor(y);
    return y;
}

function calculate_number(cell_x, cell_y) {
    const width = table_root.width / cell_size;

    return cell_x + cell_y * width;
}

function handle_agnostic_cell_click(canvas, x, y, button) {
    x = screen_to_cell_x(canvas, x);
    y = screen_to_cell_y(canvas, y);
    const int = calculate_number(x, y);

    switch (button) {
        case "left":
            if (int === 0 || int === 1) return;
            set_toggle(checked_numbers, int);
            break;
        case "right":
            set_toggle(rchecked_numbers, int);
            break;
    }

    rerender()
}

function init_table(table_root, width, height) {
    table_root.innerHTML = "";
    checked_numbers.clear();
    rchecked_numbers.clear();

    table_root.width = width * cell_size
    table_root.height = height * cell_size
    table_root.style.width = (width * cell_size).toString(10)
    table_root.style.height = (height * cell_size).toString(10)

    rerender()
}

function init_constellation_settings(number_of_constellations) {
    constellation_settings = new Array(number_of_constellations)

    const create_text = (string) => {
        const text = document.createElement("span")
        text.innerText = string
        return text
    }
    const labelarise = (el, string) => {
        const label = document.createElement("label")
        label.appendChild(create_text(string))
        label.appendChild(el)
        return label
    }

    function add_change_listener(el) {
        const on_change = rerender

        el.addEventListener("change", on_change)
        // el.addEventListener("keydown", on_change)
    }

    function text_input_init(el) {
        el.classList.add("constellation-settings")
        el.classList.add("digits-only")
        el.type = "text"
    }

    for (let i = 0; i < number_of_constellations; i++) {
        const settings_obj = {}

        const container = document.createElement("div")
        container.classList.add("constellation-settings")

        const enabled = document.createElement("input")
        settings_obj.enabled = enabled
        enabled.type = "checkbox"
        enabled.checked = i === 0
        container.appendChild(enabled)

        const multiply = document.createElement("input")
        settings_obj.multiply = multiply
        text_input_init(multiply)
        multiply.value = "1"
        container.appendChild(multiply)

        container.appendChild(create_text("· t +"))

        const add = document.createElement("input")
        settings_obj.add = add
        text_input_init(add)
        add.value = (2 * i).toString(10)
        container.appendChild(add)

        constellation_settings_container.appendChild(container)
        constellation_settings[i] = settings_obj

        add_change_listener(enabled)
        add_change_listener(multiply)
        add_change_listener(add)
    }
}

function init_settings_toggle() {
    function find_toggleable_element(el) {
        if (el.hasAttribute("data-setting-hidden")) return el;
        return find_toggleable_element(el.parentNode)
    }

    document.querySelectorAll(".setting-visibility-toggle").forEach(el => {
        el.addEventListener("click", () => {
            const toggle = find_toggleable_element(el)
            toggle.setAttribute("data-setting-hidden", 1 - parseInt(toggle.getAttribute("data-setting-hidden"), 10))
        })
    })
}

function is_prime(number) {
    for (let i = 2; i * i <= number; i++) {
        if (number % i === 0) return false;
    }

    return true;
}

function get_number_info(number) {
    if (number === 0) return "0 = 0<sup>1</sup>";
    if (number === 1) return "1 = 1<sup>1</sup>";

    const exponents = new Map();
    const original_number = number;

    for (let i = 2; number !== 1; i++) {
        if (!is_prime(i)) continue;
        if (number % i !== 0) continue;
        exponents.set(i, 1);
        number = Math.floor(number / i);
        while (number % i === 0) {
            exponents.set(i, exponents.get(i) + 1);
            number = Math.floor(number / i);
        }
    }

    let factorisation_string = [...exponents
        .entries()
        .map(([prime, exponent]) => `${prime}<sup>${exponent}</sup>`)
    ].join(" · ");

    return `${original_number} = ${factorisation_string}`;
}

function eratosthenes_init() {
    if (eratosthenes_initialised) return
    if (!(document.readyState === "interactive" || document.readyState === "complete")) return
    eratosthenes_initialised = true

    console.log("Initialising eratosthenes stuff");

    table_root = document.querySelector("#table-root");
    table_width_input = document.querySelector("#table-width");
    table_height_input = document.querySelector("#table-height");
    create_table_button = document.querySelector("#create-table-button");
    constellation_settings_container = document.querySelector("#constellation-settings-container");
    number_info_element = document.getElementById("number-info");

    init_constellation_settings(3)

    table_width_input.value = "30"
    table_height_input.value = "7"
    create_table_button.addEventListener("click", () => {
        const width = parseInt(table_width_input.value, 10)
        const height = parseInt(table_height_input.value, 10)

        if (isNaN(width) || isNaN(height)) {
            handle_user_error(`Must specify integers as dimensions for the table, but you gave me ${width} and ${height}`)
            return
        }

        if (width <= 0 || height <= 0) {
            handle_user_error(`C'mon, the dimensions for the table must be positive integers, instead I am met with ${width} and ${height}`)
            return
        }

        init_table(table_root, width, height)
    })
    create_table_button.click()

    document.querySelectorAll(".digits-only").forEach(el => {
        el.addEventListener("input", event => {
            let cursor_position = el.selectionStart

            el.value = el.value.replaceAll(/[^0-9]/g, "")
            if (el.value.length === 0) {
                el.value = "0"
            }

            cursor_position = clamp(cursor_position, 0, el.value.length)
            el.selectionStart = cursor_position
            el.selectionEnd = cursor_position
        })
    })

    table_root.addEventListener(
        "pointerdown",
        event => {
            let button;
            switch (event.buttons) {
                case 1:
                    button = "left";
                    break;
                case 2:
                    button = "right";
                    break;
                default:
                    return;
            }
            handle_agnostic_cell_click(table_root, event.offsetX, event.offsetY, button);
            event.preventDefault();
        }
    );

    table_root.addEventListener(
        "mousemove",
        event => {
            current_mouse_x = screen_to_cell_x(table_root, event.offsetX);
            current_mouse_y = screen_to_cell_y(table_root, event.offsetY);
            number_info_element.innerHTML = get_number_info(calculate_number(current_mouse_x, current_mouse_y));
        }
    )

    table_root.addEventListener("contextmenu", event => event.preventDefault());

    init_settings_toggle();
}

eratosthenes_init()

document.addEventListener("readystatechange", () => {
    eratosthenes_init()
})