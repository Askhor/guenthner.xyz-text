'use strict';

async function new_something(thing, api) {
    const path = current_path + `/New ${thing}`;
    const response = await fetch(api_url(api, path), {
        headers: {"x-csrftoken": csrf_token},
        method: "POST"
    });
    switch (response.status) {
        case 201:
            return;
        case 400:
            plain_status(`${thing} ${path} already exists`);
            break;
        default:
            plain_status(`Creating ${thing.toLowerCase()} ${path} failed`);
            break;
    }
    location.reload();
}

async function new_file() {
    await new_something("File", "new");
}

async function new_dir() {
    await new_something("Folder", "mkdir");
}

async function move_file(file, path) {
    console.log(`Moving ${file.path} to ${path}`);
    const response = await fetch(api_url("move", file.path), {
        headers: {"x-csrftoken": csrf_token},
        method: "POST",
        body: path
    });
    switch (response.status) {
        case 200:
            return true;
        case 400:
            plain_status(`File ${path} already exists`);
            break;
        default:
            plain_status(`Moving ${file.path} to ${path} failed`);
            break;
    }

    return false
}

async function rename_file(file) {
    const new_name = window.prompt(`Rename ${file.name} to:`, file.name);
    const split_index = file.path.lastIndexOf("/");

    let new_path;

    if (split_index === -1) {
        new_path = new_name;
    } else {
        new_path = file.path.slice(0, split_index) + "/" + new_name;
    }

    const success = await move_file(file, new_path);

    if (success)
        location.reload();
}

async function move_files() {
    const selection = Alpine.store("files").filter(f => f.selected);
    const dst = window.prompt(`Move ${selection.length} files to:`);

    if (dst === null) {
        return;
    }

    const promises = [];

    for (const file of selection) {
        promises.push(move_file(file, dst + "/" + file.name));
    }

    let success = true;

    for (const p of promises) success &= await p;

    if (success) location.reload();
}

async function delete_files() {
    const selection = Alpine.store("files").filter(f => f.selected);

    const promises = [];

    for (const file of selection) {
        promises.push(move_file(file, ".trash" + "/" + file.path));
    }

    let success = true;

    for (const p of promises) success &= await p;

    if (success) location.reload();
}
