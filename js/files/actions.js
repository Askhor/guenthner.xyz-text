'use strict';

async function file_exists(file) {
    const response = await fetch(api_url("info", file), {method: "HEAD"});

    switch (response.status) {
        case 200:
            return true;
        case 404:
            return false;
        default:
            return null;
    }
}

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
    let new_name = window.prompt(`Rename ${file.name} to:`, file.name);
    if (new_name === null) new_name = file.name;
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

async function move_file_to_trash(file) {
    let new_file = ".trash" + "/" + file.path;

    while (await file_exists(new_file)) {
        new_file += "_";
    }

    await move_file(file, new_file);
}

async function delete_files(files = null) {
    if (files === null)
        files = Alpine.store("files").filter(f => f.selected);

    const promises = [];

    for (const file of files) {
        promises.push(move_file_to_trash(file));
    }

    let success = true;

    for (const p of promises) success &= await p;

    if (success) location.reload();
}

async function unzip(file) {
    const response = await fetch(api_url("unzip", file), {
        method: "POST",
        headers: {"x-csrftoken": csrf_token}
    });

    switch (response.status) {
        case 200:
            console.log(`Successfully unzipped ${file}`);
            break;
        case 400:
            const json = await response.json();
            plain_status(`The following problems were found in the zip file ${file}: ${json.errors}`);
            break;
        default:
            console.log(`Unknown error occurred: ${response.status} at unzipping ${file}`)
            break;
    }
}
