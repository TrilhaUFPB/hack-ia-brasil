#!/usr/bin/env node
import { publicar } from './comandos/publicar.mjs'

process.exitCode = await publicar(process.argv.slice(2))
