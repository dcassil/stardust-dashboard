# @stardust-cms/dashboard

An extensible **host dashboard boilerplate** for building in-iframe visual editors on top of
[`@stardust-cms/iframe-adapter`](https://www.npmjs.com/package/@stardust-cms/iframe-adapter).

Bring your own content store (implement `ContentStoreAdapter`) and your own block types
(`BlockType[]`), render `<HostShell>`, and get a working editor: overlay-based select / insert /
move / edit / delete over an embedded site, with draft/live and version navigation where your
store supports it.

The reference example backs the dashboard with the
[`versioned-content-engine`](https://github.com/dcassil/versioned-content-engine) to demonstrate a
full draft → preview → publish → inspect-previous-version workflow (including corrected
delete/history semantics).

## Status

Under active development.

## Peers

- `@stardust-cms/iframe-adapter` (host primitives + protocol)
- `frame-link-react` / `frame-link` (transport)
- `react` >= 18

## License

MIT
