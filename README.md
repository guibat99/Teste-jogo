# Battle Royale Mobile 3D (protótipo)

Projeto web 3D em Three.js com foco mobile, inspirado no gênero battle royale.

## Sistemas implementados

- Tela de capa/cover e fluxo de iniciar/reiniciar partida.
- Mundo 3D com câmera em terceira pessoa.
- Controles mobile com joystick virtual + botões (atirar, pular, kit).
- Sistema de vida, escudo, munição e kits médicos.
- Loot de ammo/medkit/shield no mapa.
- Bots com IA simples (patrulha + perseguição + tiro).
- Sistema de tiro com projéteis e dano.
- Zona segura que encolhe e causa dano fora dela.
- Condição de vitória e derrota.
- Minimap com jogador, bots e raio da zona.

## Como rodar

Como usa módulos ES, rode via servidor HTTP local.

```bash
python3 -m http.server 4173
```

Depois acesse: `http://localhost:4173`

## Observações

- Este é um protótipo educacional original e **não é cópia de assets/código** de jogos comerciais.
- Para produção mobile real (Android/iOS), recomenda-se engine dedicada (Unity/Unreal/Godot), backend multiplayer, anti-cheat e pipeline de arte.
