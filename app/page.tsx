import Reveal from "./Reveal";

const facts = [
  ["QUANDO", "Sábado, 21 de novembro, das 8h às 18h"],
  ["ONDE", "R. Manoel Gualberto, 255, Miramar, João Pessoa"],
  ["QUEM", "Brasileiros de 12 a 25 anos, de qualquer lugar"],
  ["CUSTO", "Gratuito"],
  ["PARCERIA", "Lazarte Franceschi Fellowship e Trilha"],
];
const perks = [
  ["01", "R$ 100 mil em prêmios", "Para se dedicar ao problema mais difícil que você quer resolver."],
  ["02", "Uma semana em São Francisco", "Com os outros fellows, conhecendo grandes founders."],
  ["03", "Mentoria de Pedro e Victor", "Fundadores da Wildlife e da Diffusion."],
  ["04", "Apoio no visto americano", "Suporte ao processo de visto americano."],
];
const hours = ["08","09","10","11","12","13","14","15","16","17","18"];
const schedule = [
  ["08:00", "Credenciamento e café", "ENTRADA"],
  ["09:00", "Abertura e tema", "AUDITÓRIO"],
  ["09:30", "Hacking", "PÁTIO E SALAS"],
  ["12:30", "Almoço", "CANTINA"],
  ["16:30", "Pitches", "AUDITÓRIO"],
  ["17:30", "Júri e prêmios", "AUDITÓRIO"],
  ["18:00", "Encerramento", "AUDITÓRIO"],
];
const founders = [
  ["Pedro Franceschi", "FOUNDER E CEO DA BREX", "Começou a programar aos 9, fez o primeiro jailbreak do iPhone 3G aos 12 e fundou o Pagar.me aos 15. A Brex foi adquirida pela Capital One na maior aquisição de uma empresa fundada por brasileiros."],
  ["Victor Lazarte", "FOUNDER E GP DA DIFFUSION", "Fundou a Wildlife com o irmão, foi sócio da Benchmark em São Francisco e hoje lidera a Diffusion, o maior fundo de IA fundado por brasileiros."],
];
const h1 = ["Um hackathon", "em João Pessoa", "pode ser o seu", "caminho para o", "Vale do Silício."];

export default function Home() {
  return (
    <>
      <nav className="nav">
        <div className="brand"><i /><span>LF Hack</span></div>
        <div className="nav-links">
          <a href="#evento">O EVENTO</a><a href="#premio">PRÊMIO</a><a href="#programa">PROGRAMA</a><a href="#quem">QUEM</a>
        </div>
        <a href="#inscricao" className="btn-lime">INSCREVA-SE →</a>
      </nav>

      <section className="hero">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: "0 1 auto" }}>
          <div className="sun-row"><div className="sun-box"><div className="sun" /></div></div>
          <div className="horizon" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px,3vh,32px)", alignItems: "center", textAlign: "center", width: "100%" }}>
          <h1>
            {h1.map((t, i) => (
              <span key={t} className={i === 4 ? "lime" : ""} style={{ ["--d" as string]: `${1.1 + i * 0.15}s` }}>{t} </span>
            ))}
          </h1>
          <div className="hero-bottom">
            <a href="#inscricao" className="btn-paper">Quero participar <span className="mono">→</span></a>
          </div>
        </div>
      </section>

      <section id="evento" className="section">
        <div className="wrap evento">
          <Reveal className="col reveal">
            <span className="eyebrow">O EVENTO</span>
            <h2>Dez horas. Um problema difícil. O foco é achar pessoas, não só projetos.</h2>
          </Reveal>
          <Reveal className="facts reveal" delay=".15s">
            {facts.map(([k, v]) => (
              <div className="fact" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
            ))}
          </Reveal>
        </div>
      </section>

      <section id="premio" className="section premio">
        <div className="wrap col" style={{ gap: "clamp(40px,5vw,72px)" }}>
          <Reveal className="col reveal" >
            <span className="eyebrow">O QUE ESTÁ EM JOGO</span>
            <h2>O vencedor pula fila na fellowship.</h2>
            <p className="lead">A <a href="https://iabrasil.com/" target="_blank" rel="noopener noreferrer" className="ulink">Lazarte Franceschi Fellowship</a> é um programa de um ano para jovens com talento técnico excepcional. Não precisa ter ideia nem empresa pronta. O time vencedor do LF Hack vai direto para a entrevista.</p>
          </Reveal>
          <Reveal className="perks reveal">
            {perks.map(([n, t, d]) => (
              <div className="perk" key={n}>
                <span className="n">{n}</span>
                <div><span className="t">{t}</span><span className="d">{d}</span></div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section id="programa" className="section">
        <div className="wrap col" style={{ gap: "clamp(40px,5vw,64px)" }}>
          <Reveal className="prog-head reveal">
            <div className="col" style={{ gap: 20 }}>
              <span className="eyebrow">O DIA</span>
              <h2>Das 8h às 18h.</h2>
            </div>
          </Reveal>
          <div>
            <Reveal className="ruler reveal" delay=".1s"><i /></Reveal>
            <div className="hours">{hours.map((h) => <span key={h}>{h}</span>)}</div>
          </div>
          <div className="sched">
            {schedule.map(([t, n, d]) => (
              <Reveal className="row reveal" key={t}>
                <span className="t">{t}</span><span className="n">{n}</span><span className="d">{d}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="quem" className="section quem" style={{ maxWidth: 1360 + 128, margin: "0 auto" }}>
        <Reveal className="col reveal">
          <span className="eyebrow">QUEM PODE</span>
          <h2>Brasileiros de 12 a 25 anos que constroem coisas.</h2>
          <p className="lead">Software, IA, hardware, robótica, matemática, física, química ou biotecnologia. Ensino médio, IF, olimpíada ou universidade: o que conta é o que você já fez. Menores de 18 precisam da confirmação de um responsável.</p>
        </Reveal>
        <div className="founders">
          {founders.map(([n, r, b], i) => (
            <Reveal className="founder reveal" key={n}>
              <a className="photo-link" href={i === 0 ? "https://www.linkedin.com/in/pfranceschi/" : "https://www.linkedin.com/in/victorlazarte/"} target="_blank" rel="noopener noreferrer" aria-label={`${n} no LinkedIn`}>
                <img className="photo" src={i === 0 ? "/pedro.png" : "/victor.png"} alt={n} />
                <span className="photo-cta">LINKEDIN ↗</span>
              </a>
              <div className="info"><span className="name">{n}</span><span className="role">{r}</span><span className="bio">{b}</span></div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="inscricao" className="cta">
        <Reveal className="cta-inner reveal">
          <h2>O sol nasce primeiro aqui.</h2>
          <span className="btn-soon"><i />Inscrições em breve</span>
        </Reveal>
        <Reveal className="cta-sun">
          <div className="sun-row"><div className="sun-box"><div className="sun" /></div></div>
          <div className="horizon" style={{ animation: "none" }} />
        </Reveal>
      </section>

      <footer>
        <div className="brand"><i /><span>LF Hack</span></div>
        <span><span className="copy">©</span> 2026 LF Hack · Todos os direitos reservados.</span>
      </footer>
    </>
  );
}
