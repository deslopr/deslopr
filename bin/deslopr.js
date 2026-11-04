#!/usr/bin/env node
import { main } from '../src/node/cli.js';

main().then((code) => { process.exitCode = code; });
