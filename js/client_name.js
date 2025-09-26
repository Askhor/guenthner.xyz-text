function client_name_button() {
    return document.getElementById("client-name-button")
}

function client_name_field() {
    return document.getElementById("client-name-field")
}

function getCookie(name) {
    let cookie = document.cookie.split(";")
        .find(string => string.trim().startsWith(name))

    if (cookie === null || cookie === undefined) {
        return null
    }

    return decodeURIComponent(cookie.split("=")[1].trim())
}

function client_name_button_press(event) {
    client_name_button().style.display = "none"
    client_name_field().style.display = "inline"

    let current_name = getCookie("client_name")
    if (current_name === null) current_name = ""
    client_name_field().value = current_name

    client_name_field().focus()
}

function client_name_field_enter(event) {
    if (event.key !== "Enter") return
    client_name_field().style.display = "none"
    client_name_button().style.display = "inline"

    let new_name = client_name_field().value
    document.cookie = `client_name=${encodeURIComponent(new_name)};path=/;Expires=Fri, 31 Dec 9999 23:59:59 GMT;Max-Age=259200000`
    update_client_names(new_name)
}

function update_client_names(new_value) {
    console.log(`Setting client name to ${new_value}`);
    for (const element of document.getElementsByClassName("client-name")) {
        element.innerText = new_value
    }
}

let client_name_initialised = false

function client_name_init() {
    if (client_name_initialised) return
    if (!(document.readyState === "interactive" || document.readyState === "complete")) return
    client_name_initialised = true

    console.log("Initialising client name stuff")
    client_name_button().onclick = client_name_button_press
    client_name_field().onkeydown = client_name_field_enter

    let current_name = getCookie("client_name")
    if (current_name !== null) {
        update_client_names(current_name);
    }
}

client_name_init()

document.addEventListener("readystatechange", () => {
    client_name_init()
})