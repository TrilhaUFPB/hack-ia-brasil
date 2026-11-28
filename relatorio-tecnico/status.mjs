#!/usr/bin/env node
import { status } from './comandos/status.mjs'

process.exitCode = await status(process.argv.slice(2))
