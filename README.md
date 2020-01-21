# @slater/sync

Sync files between your local machine and a remote Shopify theme.

## Install

```bash
npm i @slater/sync --save
```

## Usage

```javascript
const sync = require("@slater/sync");

const theme = sync({
  id: "12345...",
  password: "abcde...",
  store: "store-name.myshopify.com",
  ignore: []
});
```

#### `sync`

```javascript
// single file
theme.sync("./build/snippets/nav.liquid");

// multiple files
theme.sync(["./build/snippets/nav.liquid", "./build/templates/index.liquid"]);

// or a directory
theme.sync(["./build/snippets/"]);
```

#### `unsync`

```javascript
theme.unsync(["templates/index.liquid"]);
```

## License

MIT License © [The Couch](https://thecouch.nyc)
