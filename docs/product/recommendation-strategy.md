# Estrategia de recomendacao

## Objetivo

Gerar a secao "Recomendado para voce" a partir do comportamento real do usuario, sem depender de IA ou de servicos externos no MVP. O algoritmo deve ser explicavel, barato e evoluir sem alterar o contrato da interface.

## Ativacao

- Antes de cinco interacoes relevantes, usar um cold start com titulos populares, bem avaliados e diversos.
- Considerar como interacao relevante uma avaliacao ou um conteudo marcado como assistindo, concluido ou abandonado.
- Apos cinco interacoes, combinar afinidade pessoal, qualidade global e sinais sociais.
- Excluir candidatos ja concluidos ou abandonados pelo usuario.

## Perfil de afinidade

Calcular uma pontuacao por genero a partir de `tb_user_content` e `tb_content_genre`:

| Evento                 | Peso base |
| ---------------------- | --------: |
| Conteudo concluido     |        +3 |
| Conteudo em andamento  |        +1 |
| Avaliacao entre 8 e 10 |        +4 |
| Avaliacao entre 6 e 7  |        +1 |
| Conteudo abandonado    |        -2 |

Aplicar um pequeno fator de recencia para impedir que preferencias antigas dominem permanentemente o perfil. Os pesos devem permanecer configuraveis e cobertos por testes.

## Pontuacao de candidatos

Normalizar cada sinal entre 0 e 1 e calcular inicialmente:

```text
score =
  afinidade_generos * 0.50 +
  qualidade_global * 0.20 +
  popularidade_amigos * 0.15 +
  diversidade * 0.10 +
  recencia_lancamento * 0.05
```

- `afinidade_generos`: proximidade entre os generos do titulo e o perfil do usuario.
- `qualidade_global`: nota com correcao por quantidade de votos, evitando favorecer titulos com poucas avaliacoes.
- `popularidade_amigos`: proporcao de amigos que concluiram ou avaliaram positivamente o titulo.
- `diversidade`: penalidade para repeticao excessiva do mesmo genero, franquia ou tipo de conteudo.
- `recencia_lancamento`: impulso pequeno para lancamentos, sem substituir afinidade e qualidade.

## Execucao no MVP

- Implementar com consultas SQL/Prisma sobre o PostgreSQL existente.
- Recalcular quando o usuario avaliar ou alterar o status de um conteudo; adicionar cache apenas quando houver evidencia de custo.
- Persistir o identificador externo do catalogo, mas manter avaliacoes, listas e sinais sociais como dados proprios da Viue.
- Registrar os componentes do score para permitir explicacoes como "porque voce gosta de ficcao cientifica".

## Evolucao

1. Conteudo baseado em generos, notas e sinais sociais.
2. Coocorrencia: usuarios que gostaram dos mesmos titulos tambem gostaram de outros candidatos.
3. Modelo hibrido com filtragem colaborativa e, se necessario, embeddings para sinopses e palavras-chave.

Embeddings nao devem usar dados de um provedor quando os termos desse provedor proibirem treinamento ou uso em aplicacoes de IA. Antes de cada evolucao, revisar licenca, volume de interacoes, qualidade medida e custo operacional.

## Metricas

- Taxa de abertura de detalhes a partir das recomendacoes.
- Adicoes a lista e marcacoes como assistindo.
- Avaliacoes positivas dos itens recomendados.
- Cobertura e diversidade do catalogo recomendado.
- Taxa de rejeicao ou abandono.

O algoritmo so deve ser promovido quando superar a lista generica de populares em um teste controlado.
