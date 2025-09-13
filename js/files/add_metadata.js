const image_mime_re = new RegExp("image/.*");

function new_element(type, init) {
    const el = document.createElement(type);
    init(el);
    return el
}

function get_file_size_human(bytes) {
    let level = 0;
    while (bytes >= 1000 && level < 3) {
        level += 1;
        bytes /= 1000;
    }
    const endings = "BKMG";

    return `${Math.round(bytes * 100) / 100}${endings.charAt(level)}`;
}

function set_icon(mime, path, element) {
    if (mime === "text/plain") {
        element.appendChild(new_element("span", span => {
            span.classList.add("icon");
            span.textContent = "📄";
        }));
    } else if (image_mime_re.test(mime)) {
        element.appendChild(new_element("img", img => {
            img.classList.add("icon");
            img.loading = "lazy";
            img.src = api_url("icon", path);
        }));
    }
}

async function add_metadata() {
    for (const file of files) {
        try {
            let response = await fetch(api_url("info", file));
            let json = await response.json();
            let base64 = json["ascii key"];
            let icon = document.getElementById("icon-" + base64);
            let type = document.getElementById("type-" + base64);
            let size = document.getElementById("size-" + base64);

            if (icon === null || type === null || size === null) {
                console.log(file, base64);
            }

            set_icon(json["mime"], json["path"], icon);
            type.textContent = json["mime"];
            size.textContent = get_file_size_human(json["size"]);
            size.style.textAlign = "right";
        } catch (e) {
            console.log(e);
        }
    }
}

setTimeout(add_metadata, 0);