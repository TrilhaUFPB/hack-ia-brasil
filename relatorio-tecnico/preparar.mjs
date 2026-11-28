#!/usr/bin/env node
import { preparar } from './comandos/preparar.mjs'

process.exitCode = await preparar(process.argv.slice(2))
