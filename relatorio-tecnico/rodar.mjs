#!/usr/bin/env node
import { rodar } from './comandos/rodar.mjs'

process.exitCode = await rodar(process.argv.slice(2))
