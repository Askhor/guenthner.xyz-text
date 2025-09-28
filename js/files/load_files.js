"use strict";

async function load_file(name, path) {
    const files = Alpine.store("files")
    const file = Alpine.reactive({
        selected: false,
        name: name,
        path: path,
        icon: "",
        type: "",
        size: "",
    })
    files.push(file);
}

async function load_all_files() {
    const response = await fetch(api_url("raw", current_path))
    if (response.status === 200) {
        // do stuff with files
        const json = await response.json();
        for (const [name, path] of Object.entries(json)) {
            await load_file(name, path);
        }

        document.dispatchEvent(new CustomEvent("files_loaded"))
    } else {
        // retry after 1 sec
        console.log(`Loading files failed at ${current_path}; Retrying in 1 second`);
        setTimeout(load_all_files, 1000);
    }
}

setTimeout(load_all_files, 0);