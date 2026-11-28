/**
 * Rede dos containers do harness. Todo container que roda código de equipe ou
 * abre página de equipe fica numa rede dentro de `FAIXA`. Uma cadeia de
 * firewall na VM do Docker descarta, só para essa faixa, o tráfego com destino
 * a rede privada. O container alcança a internet e não alcança a máquina de
 * quem opera nem a rede local do evento.
 */
import { createHash } from 'node:crypto'
import { rodar } from './processo.mjs'

export const FAIXA = '10.213.0.0/16'
export const REDE_DO_NAVEGADOR = 'rt-navegador'
const SUBREDE_DO_NAVEGADOR = '10.213.0.0/24'
const CADEIA = 'RT-ISOLAMENTO'
const DESTINOS_BLOQUEADOS = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16', '100.64.0.0/10']

/** Blocos /28 dentro da faixa, fora do /24 do navegador: 16 endereços bastam para projeto, auxiliar de DNS e navegador. */
const TOTAL_DE_BLOCOS = 4080

function subredeDoBloco(indice) {
  const deslocamento = 256 + (indice % TOTAL_DE_BLOCOS) * 16
  return `10.213.${deslocamento >> 8}.${deslocamento & 0xff}/28`
}

async function redeExiste(nome) {
  const { codigo } = await rodar('docker', ['network', 'inspect', nome])
  return codigo === 0
}

/**
 * Cria, se não existir, uma rede bridge dentro da faixa isolada.
 * A sub-rede vem do nome; se já estiver ocupada, tenta as seguintes.
 * @param {string} nome
 * @returns {Promise<string>} o nome da rede
 */
export async function garantirRede(nome) {
  if (await redeExiste(nome)) return nome
  if (nome === REDE_DO_NAVEGADOR) {
    const { codigo, stderr } = await rodar('docker', ['network', 'create', '--label', 'rt=1', '--subnet', SUBREDE_DO_NAVEGADOR, nome])
    if (codigo !== 0 && !(await redeExiste(nome))) throw new Error(`não foi possível criar a rede ${nome}: ${stderr.trim()}`)
    return nome
  }
  const inicio = createHash('sha256').update(nome).digest().readUInt32BE(0)
  let ultimoErro = ''
  for (let tentativa = 0; tentativa < 40; tentativa += 1) {
    const subrede = subredeDoBloco(inicio + tentativa)
    const { codigo, stderr } = await rodar('docker', ['network', 'create', '--label', 'rt=1', '--subnet', subrede, nome])
    if (codigo === 0 || (await redeExiste(nome))) return nome
    ultimoErro = stderr.trim()
    if (!/overlap/i.test(ultimoErro)) break
  }
  throw new Error(`não foi possível criar a rede ${nome}: ${ultimoErro}`)
}

/** Só cria a cadeia se ela não existe: esvaziar e recriar abriria uma janela sem regra para containers já rodando. */
const SCRIPT_DA_CADEIA = [
  `if iptables -N ${CADEIA} 2>/dev/null; then`,
  `iptables -A ${CADEIA} -d ${FAIXA} -j RETURN;`,
  ...DESTINOS_BLOQUEADOS.map((destino) => `iptables -A ${CADEIA} -d ${destino} -j DROP;`),
  `iptables -A ${CADEIA} -j RETURN;`,
  'fi;',
  `iptables -C DOCKER-USER -s ${FAIXA} -j ${CADEIA} 2>/dev/null || iptables -I DOCKER-USER -s ${FAIXA} -j ${CADEIA}`,
].join(' ')

async function dockerEhColima() {
  const { codigo, stdout } = await rodar('docker', ['info', '--format', '{{.Name}}'])
  return codigo === 0 && stdout.trim().startsWith('colima')
}

const SONDA = [
  'alvo=$(getent hosts host.docker.internal | cut -d" " -f1)',
  'curl -s -m 3 -o /dev/null "http://${alvo:-192.168.5.2}:1/"; echo "maquina=$?"',
  'curl -s -m 8 -o /dev/null https://example.com; echo "internet=$?"',
].join('; ')

/**
 * Prova o isolamento com um container de verdade na rede do navegador.
 * Pacote descartado pelo firewall faz o curl estourar o tempo (código 28).
 * Máquina alcançável com porta fechada responde na hora (código 7).
 * @param {string} imagem imagem com curl, por exemplo CONFIG.imagens.base
 * @returns {Promise<{ativo: boolean, detalhe: string}>}
 */
export async function provarIsolamento(imagem) {
  await garantirRede(REDE_DO_NAVEGADOR)
  const { stdout } = await rodar('docker', ['run', '--rm', '--label', 'rt=1', '--network', REDE_DO_NAVEGADOR, imagem, 'sh', '-c', SONDA])
  const maquina = stdout.match(/maquina=(\d+)/)?.[1]
  const internet = stdout.match(/internet=(\d+)/)?.[1]
  if (maquina === '28' && internet === '0') {
    return { ativo: true, detalhe: `containers em ${FAIXA} alcançam a internet e não alcançam esta máquina` }
  }
  if (internet !== '0') return { ativo: false, detalhe: 'o container de teste não alcançou a internet' }
  return { ativo: false, detalhe: 'o container de teste alcançou esta máquina; a regra de firewall não está valendo' }
}

/**
 * Aplica a cadeia de firewall na VM do colima e prova que ela vale. A regra
 * some quando a VM reinicia, por isso `rodar` chama esta função a cada execução.
 * @param {string} imagem imagem com curl para a prova
 * @returns {Promise<{ativo: boolean, detalhe: string}>}
 */
export async function aplicarIsolamento(imagem) {
  await garantirRede(REDE_DO_NAVEGADOR)
  if (!(await dockerEhColima())) {
    return { ativo: false, detalhe: 'o Docker desta máquina não é o colima; a regra de firewall não foi aplicada' }
  }
  const { codigo, stderr } = await rodar('colima', ['ssh', '--', 'sudo', 'sh', '-c', SCRIPT_DA_CADEIA])
  if (codigo !== 0) return { ativo: false, detalhe: `falha ao aplicar a regra de firewall: ${stderr.trim().split('\n').pop()}` }
  return provarIsolamento(imagem)
}
