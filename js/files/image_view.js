"use strict";

async function change(offset) {
    const files = get_images();
    let new_index = Alpine.store("index") + offset;
    if (new_index <= 0) new_index = 0;
    // No check on upper bound (problem while loading)
    // else if (new_index >= files.length) new_index = files.length - 1;
    Alpine.store("index", new_index);
}

async function set_index(use_metadata) {
    let images;
    if (use_metadata)
        images = get_images()
    else
        images = Alpine.store("files");

    let index = 0;
    for (let i = 0; i < images.length; i++) {
        if (images[i].name === name) {
            index = i;
            break;
        }
    }

    Alpine.store("index", index);
}

function plain_status(msg) {
    console.error(msg);
}

async function delete_current() {
    const file = get_images()[Alpine.store("index")];
    if (!window.confirm(`Delete '${file.name}'?`)) return
    Alpine.store("index", Alpine.store("index") - 1)
    await delete_files([file]);
}

document.addEventListener("files_loaded", () => set_index(false)); // Not strictly necessary
document.addEventListener("metadata_loaded", () => set_index(true));

Alpine.effect(() => {
    const url = api_url("files", current_path + '/' + get_name());
    if (location.pathname !== url)
        window.history.pushState(null, "", api_url("files", current_path + '/' + get_name()));
});