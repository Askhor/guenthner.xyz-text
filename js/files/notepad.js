'use strict';

let timeout_id = null;

async function load_notepad() {

    const response = await fetch(api_url("raw", current_path));

    switch (response.status) {
        case 200:
            const text = await response.text();
            Alpine.store("text", text);
            break;
        case 404:
            Alpine.store("status", "not found");
            Alpine.store("text", `The file ${path} does not exist`);
            break;
        default:
            Alpine.store("status", "error");
            Alpine.store("text", `There was an error loading the file ${path}`);
            break;
    }
}

async function save() {
    const response = await fetch(api_url("raw", current_path), {
        method: "POST",
        headers: {"x-csrftoken": csrf_token},
        "body": Alpine.store("text")
    });

    Alpine.store("status", response.status === 200 ? "saved" : "error")
}

async function change() {
    Alpine.store("status", "editing");
    if (timeout_id !== null) {
        clearTimeout(timeout_id);
    }

    timeout_id = setTimeout(save, 2000)
}

load_notepad().then();