# Compatibility build of decode-uri-component 0.5.1

Source: the npm package decode-uri-component@0.5.1, MIT license, retained in upstream.js and license. The upstream package fixes GHSA-vcc3-ghjq-m6fr with single-pass decoding. Its ESM-only entry is incompatible with query-string 7's require API used by Expo Router 55.

The only adaptation in index.js replaces `export default function` with `module.exports = function`. No algorithm changes. Version suffix -elas.1 marks this local compatibility build. Do not replace it by a version bump of the vulnerable 0.2.x implementation.

Upstream tarball integrity: sha512-vWHQkXgg2cE3BB4rR0c+PYw9BCQzLoNIRMI7AunIkZst74tw/vpPp7VLoYtsR/cy1f55g3XDWUslfeCZjiZJyA==

Check reproducing the transformation and behavior: tests/system-dependencies.mjs.
