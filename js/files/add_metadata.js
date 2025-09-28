"use strict";

const image_mime_re = new RegExp("image/.*");
const text_mime_re = new RegExp("text/.*");


function get_file_size_human(bytes) {
    let level = 0;
    while (bytes >= 1000 && level < 3) {
        level += 1;
        bytes /= 1000;
    }
    const endings = "BKMG";

    return `${Math.round(bytes * 100) / 100}${endings.charAt(level)}`;
}

function get_icon(mime, path) {
    if (mime === "inode/directory") {
        return "<span class=\"icon\">📁</span>";
    } else if (text_mime_re.test(mime)) {
        return `<span class="icon">📄</span>`;
    } else if (image_mime_re.test(mime)) {
        return `<img alt="" class="icon" loading="lazy" src="${api_url("icon", path)}">`;
    } else {
        return "";
    }
}

async function add_all_metadata() {
    const response = await fetch(api_url("info", current_path, "level=1"));

    if (response.status === 200) {
        const json = await response.json();
        for (const file of Alpine.store("files")) {
            const file_json = json[file.path];
            file.icon = get_icon(file_json["mime"], file.path);
            file.type = file_json["mime"];
            file.size = get_file_size_human(file_json["size"]);
        }

        document.dispatchEvent(new CustomEvent("metadata_loaded"))
    } else {
        // retry after 1 sec
        console.log(`Loading file metadata failed at ${current_path}; Retrying in 1 second`);
        setTimeout(add_all_metadata, 1000);
    }
}

document.addEventListener("files_loaded", add_all_metadata)