# Ficha de Personagem — Tormenta20

Ficha de personagem interativa para o RPG **Tormenta20**, feita para a web com HTML, CSS e JavaScript puro.

Este é meu projeto de portfólio e Trabalho de Conclusão de Curso (TCC). Com ele, pratico **JavaScript** e **Programação Orientada a Objetos** construindo algo que uso de verdade nas mesas de RPG.

> Projeto de fã, sem fins comerciais e sem vínculo com a Jambô Editora, detentora de Tormenta20.

## Objetivos

- **Curto prazo:** um criador e uma ficha de personagem que apliquem as regras de criação do Tormenta20 (raças, origens, classes, atributos, perícias, habilidades, magias, equipamento e valores derivados), com a melhor experiência possível para quem está montando o personagem.
- **Longo prazo:** uma plataforma web para jogar RPG de mesa com os amigos em salas compartilhadas, com suporte a vários sistemas além do Tormenta20.

## O que já está pronto

### Ficha (HTML + CSS)

- Ficha completa em duas páginas, inspirada na ficha oficial:
  - **Página 1:** identificação, atributos, PV e PM, ataques, defesa, proficiências, armadura e escudo, tamanho, XP, deslocamento, perícias e equipamento.
  - **Página 2:** descrição, habilidades de raça e origem, habilidades de classe e poderes, magias e anotações.
- Identidade visual própria: fontes Cinzel e Alegreya Sans, fundo de "papel" e pinceladas vermelhas, com as cores organizadas em variáveis CSS.
- **Layout responsivo** com CSS Grid: desktop, tablet e celular. No celular, as tabelas de ataques e magias viram cartões.
- **Raça, Origem, Classe e Divindade** em listas suspensas, prontas para serem preenchidas e filtradas pelas regras do jogo.
- **Janela de modificador de dano** em cada ataque: no campo Dano vai só o dado (ex.: `1d8`), e numa janela a pessoa escolhe qual atributo somar e se ele entra no cálculo. A janela usa o `popover` nativo do HTML, sem JavaScript.
- HTML preparado para a lógica: valores calculados em elementos `<output>`, botões de rolagem marcados com `data-rolagem` e atributos `data-*` como contrato entre a marcação e o JavaScript.

### Dados animados 3D (`js/dados/`)

Dados de RPG em 3D com **Three.js**: d4, d6, d8, d10, d12, d20 e d% (dois d10, um de dezenas e outro de unidades).

- **Animação roteirizada:** o resultado é sorteado pela lógica de rolagem, e a animação faz o dado girar, quicar e parar exatamente na face sorteada. Assim o resultado é confiável e, no futuro, todos os jogadores de uma sala poderão ver a mesma rolagem.
- **Numeração realista:** faces opostas somam como num dado de verdade (1 oposto ao 20 no d20, 1 oposto ao 6 no d6), e 6 e 9 aparecem sublinhados nos dados maiores.
- **Destaques:** o dado brilha num acerto crítico e fica cinza numa falha.
- **Acessibilidade:**
  - com "reduzir movimento" ativado no sistema, ou sem suporte a WebGL, os dados aparecem numa versão 2D leve;
  - o resultado é anunciado para leitores de tela.
- **Reaproveitável:** o módulo não conhece nenhuma regra de jogo, então serve para qualquer sistema de RPG.

Uso:

```js
import { BandejaDeDados } from './js/dados/BandejaDeDados.js';

const bandeja = new BandejaDeDados();
await bandeja.rolar([
  { lados: 20, valor: 20, destaque: 'critico' },
  { lados: 6, valor: 4 },
  { lados: 6, valor: 2 },
]);
```

## Tecnologias

- HTML5 (incluindo a Popover API)
- CSS3 (Grid, variáveis CSS, `:has()`, `clip-path`)
- JavaScript (ES Modules, classes e campos privados)
- [Three.js](https://threejs.org/) 0.160, carregado por CDN
- Sem frameworks, bundlers ou gerenciadores de pacote

## Estrutura

```
├── index.html            # a ficha
├── demo-dados.html       # página de teste dos dados animados
├── css/
│   ├── style.css         # visual da ficha
│   └── dados.css         # visual da bandeja de dados
└── js/
    └── dados/            # dados animados (só interface, sem regras)
        ├── BandejaDeDados.js
        ├── Renderizador3D.js
        ├── Renderizador2D.js
        ├── geometrias.js
        └── texturas.js
```

## Como rodar

O projeto usa módulos JavaScript, que não funcionam abrindo o arquivo direto do disco (`file://`). É preciso um servidor local:

```bash
npx http-server
```

Ou use a extensão **Live Server** do VS Code. Depois, abra no navegador:

- `index.html`, para a ficha;
- `demo-dados.html`, para testar os dados animados.

## Próximos passos

- [ ] Núcleo em POO, genérico para qualquer sistema: `Personagem`, `Atributo`, `Pericia`, `Rolagem`…
- [ ] Regras do Tormenta20: modificadores, perícias, defesa, carga e magias calculados automaticamente.
- [ ] Listas de raça, origem, classe e divindade preenchidas e filtradas conforme as regras.
- [ ] Cálculo de dano a partir dos dados e do atributo escolhido, com margem de ameaça e multiplicador de crítico.
- [ ] Ligar os botões 🎲 da ficha aos dados animados.
- [ ] Salvar e carregar personagens.
- [ ] Fichas para outros sistemas de RPG.
- [ ] Salas multiplayer com rolagens compartilhadas.

## Autor

Gustavo — projeto de TCC e portfólio.
