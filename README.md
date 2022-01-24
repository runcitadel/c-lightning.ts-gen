# c-lightning-client

A powerful client for c-lightning's JSON-RPC API, written in TypeScript.

### Why?

Working with c-lightning's API from TypeScript isn't easy. There are no type definitions for the API, only definitions for the responses, but that isn't enough.
This project tries to turn those schemas, together the official documentation markdown files, into an useful TypeScript library.

### How to add a new version

1. Run the generate script.
2. Check for guessed and wrong values and correct them.
3. Test it.

