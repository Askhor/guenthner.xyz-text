let message_form = null;
let message_element = null;
let error_output = null;
let reload_button = null;
let scroll_button = null;

function onSubmit(event) {
    event.preventDefault()

    fetch(message_form.action, {
        "method": "POST",
        "body": new FormData(message_form)
    }).then(r => {
        console.log("Sent message with response:", r)
        if (r.status === 200) {
            location.reload()
            message_element.value = ""
        } else if (r.status === 503) {
            r.text().then((value) => {
                error_output.textContent = value
            })
        }
    })
}

function onKeyPress(event) {
    if (!event.shiftKey || event.key !== "Enter") return;
    onSubmit(event)
}

let chat_js_initialised = false

function chat_js_init() {
    if (chat_js_initialised) return
    if (!(document.readyState === "interactive" || document.readyState === "complete")) return
    chat_js_initialised = true

    console.log("Initialising chat stuff")

    message_form = document.getElementById("message-form")
    message_element = document.getElementById("message-input")
    error_output = document.getElementById("error-output")
    reload_button = document.getElementById("reload-button")
    scroll_button = document.getElementById("scroll-button")

    message_form.onsubmit = onSubmit
    message_element.onkeydown = onKeyPress
    reload_button.onclick = () => location.reload()
    scroll_button.onclick = () => window.scrollTo(0, document.querySelector("main").scrollHeight)
}

chat_js_init()

document.addEventListener("readystatechange", () => {
    chat_js_init()
})