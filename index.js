const fs = require("fs-extra");
const fetch = require("node-fetch");
const readdir = require("recursive-readdir");
const mm = require("micromatch");

const { cleanPath, getFileKey } = require("@slater/util");

const mergeConfig = require("./lib/mergeConfig.js");
const enqueue = require("./lib/enqueue.js");

function encodeFile(file) {
  return Buffer.from(fs.readFileSync(file), "utf-8").toString("base64");
}

function createStoreConnection(config) {
  return function storeAPI(method, asset) {
    return fetch(
      `https://${config.store}/admin/themes/${config.id}/assets.json`,
      {
        method,
        headers: {
          "X-Shopify-Access-Token": config.password,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ asset })
      }
    );
  };
}

module.exports = function create(conf) {
  const events = {};
  const config = mergeConfig(conf);
  const store = createStoreConnection(config);

  function emit(event, ...data) {
    (events[event] || []).map(cb => cb(...data));
  }

  // return undefined if critical errors
  async function handleResponse(raw) {
    try {
      const res = raw.clone();
      const { errors, asset } = await res.json();

      const data = {
        errors,
        asset
      };

      if (errors) {
        if (errors === "Not Found") {
          emit(
            "error",
            `Store URL was invalid. Please double check your config.`
          );
          return;
        } else {
          emit("error", errors, data); // for file error
        }
      }

      return data;
    } catch (e) {
      const res = raw.clone();

      if (res.status === 404) {
        emit("error", `Theme ID was invalid. Please double check your config.`);
      } else if (res.status === 401) {
        emit(
          "error",
          `Theme password was invalid. Please double check your config.`
        );
      }
    }
  }

  async function upload(fileAsset) {
    const raw = await store("PUT", fileAsset);
    return handleResponse(raw);
  }

  async function remove(fileAsset) {
    const raw = await store("DELETE", fileAsset);
    return handleResponse(raw);
  }

  async function getFiles(paths) {
    if (!paths || !paths.length) paths = ".";

    const files = [].concat(paths || []).map(cleanPath);

    let flatFiles = [];

    for (const file of files) {
      try {
        let isDir = false;

        try {
          // allows for unsyncing files from remote that are not present locally
          isDir = fs.lstatSync(file).isDirectory();
        } catch (e) {}

        if (isDir) {
          try {
            const files = await readdir(file, config.ignored);
            flatFiles = flatFiles.concat(files);
          } catch (e) {
            emit("error", e.message, e);
          }
        } else {
          flatFiles = flatFiles.concat(file);
        }
      } catch (e) {
        emit("error", e.message, e);
      }
    }

    return flatFiles.filter(file => !mm.contains(file, config.ignore));
  }

  async function sync(paths) {
    return Promise.all(
      (await getFiles(paths))
        .map(file => {
          try {
            return {
              key: getFileKey(file),
              attachment: encodeFile(file)
            };
          } catch (e) {
            emit("error", e.message, e);
            return null;
          }
        })
        .filter(Boolean)
        .map(asset =>
          enqueue(async () => {
            const res = await upload(asset);
            if (res) emit("sync", res);
            return res;
          })
        )
    );
  }

  async function unsync(paths) {
    return Promise.all(
      (await getFiles(paths))
        .map(file => ({
          key: getFileKey(file)
        }))
        .map(asset =>
          enqueue(async () => {
            const res = await remove(asset);
            if (res) emit("unsync", res);
            return res;
          })
        )
    );
  }

  return {
    sync,
    unsync,
    on(event, cb) {
      events[event] = (events[event] || []).concat(cb);
      return () => {
        events[event].splice(events[event].indexOf(cb), 1);
      };
    }
  };
};
