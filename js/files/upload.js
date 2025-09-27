"use strict";

const upload_retry_interval = 1000;
const max_requests = 20;

const percentage = new Intl.NumberFormat('default', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

plain_status("System status messages will appear here");

function plain_status(msg) {
    Alpine.store("status").push({type: "plain", content: msg});
}

function upload_status(name, path, total_packets) {
    const upload = Alpine.reactive({
        name: name,
        path: path,
        completed_packets: 0,
        total_packets: total_packets,
        packets: Alpine.reactive({}),
        complete: false,

        get progress() {
            return this.completed_packets / this.total_packets;
        },
        get percentage() {
            return percentage.format(this.progress);
        },
        get packet_hashes() {
            return Object.keys(this.packets);
        },
        get finalisation_msg() {
            if (this.complete) return "Done.";
            if (this.progress >= 1) return "Finalising.";
            return "";
        }
    });
    Alpine.store("status").push({type: "upload", upload: upload});
    return upload;
}

async function getChecksumSha256(blob) {
    const uint8Array = new Uint8Array(await blob.arrayBuffer());
    const hashBuffer = await crypto.subtle.digest('SHA-256', uint8Array);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map((h) => h.toString(16).padStart(2, '0')).join('');
}

async function upload_packet(hash, status) {
    const blob = status.blob;
    const response = await fetch(api_url("file-packet", hash), {
        headers: {
            "x-csrftoken": csrf_token
        },
        method: "POST",
        body: blob
    });

    if (response.status === 200) {
        status.set_status("STORED");
    } else {
        console.log("Failed to upload packet: " + hash);
    }
}

async function upload_ledger(path, status) {
    const response = await fetch(api_url("file-ledger", path), {
        method: "POST",
        body: JSON.stringify({hashes: status.packet_hashes}),
        headers: {
            "x-csrftoken": csrf_token
        }
    })
    const promises = [];
    if (response.status === 200 || response.status === 202) {
        if (response.status === 200) {
            console.log("Successfully uploaded file to " + path);
            status.complete = true;
        }

        const json = await response.json();
        for (const [hash, new_status] of Object.entries(json)) {
            status.packets[hash].set_status(new_status);
            if (new_status !== "STORED") {
                while (promises.length >= max_requests)
                    await promises.pop();
                promises.push(upload_packet(hash, status.packets[hash]));
            }
        }
        if (response.status === 200) return;
    } else {
        console.log("Error " + response.status + " on " + path);
        return;
    }

    for (const p of promises) {
        await p;
    }

    setTimeout(() => upload_ledger(path, status), upload_retry_interval);
}

async function test_file_exists(path) {
    const response = await fetch(api_url("info", path), {
        method: "HEAD",
        headers: {
            "pragma": "no-cache"
        }
    });

    switch (response.status) {
        case 200:
            plain_status("The file \"" + path + "\" already exists");
            return true;
        case 404:
            return false;
        default:
            console.error("Could not stat file at " + path + "(" + response.status + ")");
    }
}

async function upload(file) {
    const total_packets = Math.ceil(file.size / net_block_size);
    console.log("Uploading " + file.name + " which consists of " + total_packets + " packets");
    let path = (current_path.endsWith("/") ? current_path : current_path + "/") + file.name;
    path = path.replaceAll("./", "");

    if (await test_file_exists(path)) return;

    const status = upload_status(file.name, current_path, total_packets);
    const packets = {};

    for (let size = file.size; size > 0; size -= net_block_size) {
        const start = file.size - size;
        const length = Math.min(net_block_size, size);
        const blob = file.slice(start, start + length);
        const hash = await getChecksumSha256(blob);

        packets[hash] = Alpine.reactive({
            blob: blob,
            hash: hash,
            status: "PENDING",

            set_status(new_status) {
                if (this.status !== "STORED" && new_status === "STORED") {
                    status.completed_packets++;
                }
                this.status = new_status;
            },
            get color() {
                switch (this.status) {
                    case "PENDING":
                        return "darkgrey";
                    case"STORED":
                        return "green";
                    default:
                        return "red";
                }
            }
        });
    }

    status.packets = Alpine.reactive(packets);

    await upload_ledger(path, status);
}

async function upload_files_from(input) {
    if (input.files.length <= 0) {
        Alpine.store("status").push({type: "plain", content: "No files were selected!"});
    }

    for (const file of input.files) {
        setTimeout(() => upload(file), 0);
    }
}