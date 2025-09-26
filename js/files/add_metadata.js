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

async function add_metadata(file) {
    const response = await fetch(api_url("info", file.path));

    if (response.status === 200) {
        const json = await response.json();
        file.icon = get_icon(json["mime"], file.path);
        file.type = json["mime"];
        file.size = get_file_size_human(json["size"]);
    } else {
        // retry after 1 sec
        console.log(`Loading file metadata failed for ${file.name}; Retrying in 1 second`);
        setTimeout(() => add_metadata(file), 1000);
    }
}